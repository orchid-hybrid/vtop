/**
 * vtop – Velocity Top
 *
 * http://parall.ax/vtop
 *
 * Because `top` just ain't cutting it anymore.
 *
 * (c) 2014 James Hall, Parallax Agency Ltd
 *
 * @license MIT
 */

var App = function() {
    var canvas = require('drawille'),
	blessed = require('blessed'),
	program = blessed.program(),
	os = require('os'),
	cli = require('commander'),
	upgrade = require('./upgrade.js'),
	VERSION = require('./package.json').version,
	child_process = require('child_process'),
	glob = require("glob"),
	themes = "";

    // load themes
    var files = glob.sync(__dirname + "/themes/*.json");
    for (var i = 0; i < files.length; i++) {
	var theme_name = files[i].replace(__dirname + '/themes/', '').replace('.json', '');
	themes += theme_name + '|';
    }
    themes = themes.slice(0, -1);
    
    // Set up the commander instance and add the required options
    cli
	.option('-t, --theme  [name]', 'set the vtop theme [' + themes + ']', 'parallax')
	.option('--quit-after [seconds]', 'Quits vtop after interval', '0')
	.version(VERSION)
	.parse(process.argv);

    /**
     * Instance of blessed screen and other program state
     */
    var screen;
    var loadedTheme;
    var layouts, currentLayout, layout;
    var upgradeNotice = false;
    var graph_scale = 1;

    var charts = [];
    
    // Private functions

    /**
     * Attach header
     * @param  {string} left  This is the text to go on the left
     * @param  {string} right This is the text for the right
     * @return {void}
     *
     * this attaches a new header to the screen and starts a timer
     * to update it ever second, should only be called once.
     *
     */
    var attachHeader = function() {
	var headerText, headerTextNoTags;
	if (upgradeNotice) {
	    upgradeNotice = upgradeNotice + '';
	    headerText = ' {bold}vtop{/bold}{white-fg} for ' + os.hostname() + ' {red-bg} Press \'u\' to upgrade to v' + upgradeNotice + ' {/red-bg}{/white-fg}';
	    headerTextNoTags = ' vtop for ' + os.hostname() + '  Press \'u\' to upgrade to v' + upgradeNotice + ' ';
	} else {
	    headerText = ' {bold}vtop{/bold}{white-fg} for ' + os.hostname() + ' ';
	    headerTextNoTags = ' vtop for ' + os.hostname() + ' ';
	}
	
	var header = blessed.text({
	    top: 'top',
	    left: 'left',
	    width: headerTextNoTags.length,
	    height: '1',
	    fg: loadedTheme.title.fg,
	    content: headerText,
	    tags: true
	});
	var date = blessed.text({
	    top: 'top',
	    right: 0,
	    width: 9,
	    height: '1',
	    align: 'right',
	    content: '',
	    tags: true
	});
	screen.append(header);
	screen.append(date);
	
	var zeroPad = function(input) {
	    return ('0' + input).slice(-2);
	};
	
	var updateTime = function() {
	    var time = new Date();
	    date.setContent(zeroPad(time.getHours()) + ':' + zeroPad(time.getMinutes()) + ':' + zeroPad(time.getSeconds()) + ' ');
	    screen.render();
	};
	
	updateTime();
	setInterval(updateTime, 1000);
    };
    
    /**
     * Attach the footer
     *
     * @todo This appears to break on some viewports
     */
    var attachFooter = function() {
	
	var commands = {
	    'dd': 'Kill process',
	    'j': 'Down',
	    'k': 'Up',
	    'g': 'Jump to top',
	    'G': 'Jump to bottom',
	    'c': 'Sort by CPU',
	    'm': 'Sort by Mem'
	};
	var text = '';
	for (var c in commands) {
	    var command = commands[c];
	    text += '  {white-bg}{black-fg}' + c + '{/black-fg}{/white-bg} ' + command;
	}
	
	var footerRight = blessed.text({
	    bottom: '0',
	    left: '0%',
	    width: '100%',
	    align: 'right',
	    tags:true,
	    content: text + '    http://parall.ax/vtop ',
	    fg: loadedTheme.footer.fg
	});
	screen.append(footerRight);
    };
    
    /**
     * Repeats a string
     * @var string The string to repeat
     * @var integer The number of times to repeat
     * @return {string} The repeated chars as a string.
     */
    var stringRepeat = function(string, num) {
	if (num < 0) {
	    return '';
	}
	return new Array(num + 1).join(string);
    };
    
    /**
     * This draws a chart
     * @param  {int} chartKey The key of the chart.
     * @return {string}       The text output to draw.
     */
    var drawChart = function(chart) {
	var c = chart.canvas;
	
	c.clear();
	
	if (! chart.plugin.initialized) {
	    return false;
	}

	var dataPointsToKeep = 5000;

	chart.values[chart.position] = chart.plugin.currentValue;

	var computeValue = function(input) {
	    return c.height - Math.floor(((c.height + 1) / 100) * input) - 1;
	};

	if (chart.position > dataPointsToKeep) {
	    delete chart.values[chart.position - dataPointsToKeep];
	}

	for (var pos in chart.values) {

	    if (graph_scale >= 1 || (graph_scale < 1 && pos % (1 / graph_scale) == 0)) {
		var p = parseInt(pos, 10) + (c.width - chart.values.length);
		// calculated x-value based on graph_scale
		var x = (p * graph_scale) + ((1 - graph_scale) * c.width);

		// draws top line of chart
		if (p > 1 && computeValue(chart.values[pos - 1]) > 0) {
		    c.set(x, computeValue(chart.values[pos - 1]));
		}

		// Start deleting old data points to improve performance
		// @todo: This is not be the best place to do this

		// fills all area underneath top line
		for (var y = computeValue(chart.values[pos - 1]); y < c.height; y ++) {
		    if (graph_scale > 1 && p > 0 && y > 0) {
			var current = computeValue(chart.values[pos - 1]),
			    next = computeValue(chart.values[pos]),
			    diff = (next - current) / graph_scale;

			// adds columns between data if graph is zoomed in, takes average where data is missing to make smooth curve
			for (var i = 0; i < graph_scale; i++) {
			    c.set(x + i, y + (diff * i));
			    for (var j = y + (diff * i); j < c.height; j++) {
				c.set(x + i, j);
			    }
			}
		    } else if (graph_scale <= 1) {
			// magic number used to calculate when to draw a value onto the chart
			var allowedPValues = (chart.values.length - ((graph_scale * chart.values.length) + 1)) * -1;
			c.set(x, y);
		    }
		}
	    }
	}

	// Add percentage to top right of the chart by splicing it into the braille data
	var textOutput = c.frame().split("\n");
	var percent = '   ' + chart.plugin.currentValue;
	textOutput[0] = textOutput[0].slice(0, textOutput[0].length - 4) + '{white-fg}' + percent.slice(-3) + '%{/white-fg}';

	return textOutput.join("\n");
    };

    var layoutPanels = function() {
	// remove the panels from the previous layout
	for(i in layout.panels) {
	    screen.remove(layout.panels[i].container);
	}
	
	// then switch to the current layout
	layout = layouts[currentLayout];
	
	// compute the layout geometry
	layout.performLayout(loadedTheme, screen);

	// and add the panels back
	for(i in layout.panels) {
	    screen.append(layout.panels[i].container);
	}

	// now attach our charts to the panels
	for(i in charts) {
	    if(layout.panels[charts[i].place]) {
		layout.panels[charts[i].place].container.setLabel(' ' + charts[i].plugin.title + ' ')
		
		if(charts[i].plugin.type == 'chart') {
		    charts[i].width = (layout.panels[charts[i].place].content.width - 3) * 2;
		    charts[i].height = (layout.panels[charts[i].place].content.height - 2) * 4;
		    charts[i].canvas = new canvas(charts[i].width, charts[i].height);
		}
	    }
	}
	
	layout.panels['process']['content'].focus();
    };
    
    var draw = function() {
	for(i in charts) {
	    charts[i].plugin.poll();
	    charts[i].position++;
	    
	    if(layout.panels[charts[i].place]) {
		if(charts[i].plugin.type == 'chart') {
		    layout.panels[charts[i].place].content.setContent(drawChart(charts[i]))
		}
	    }
	}
	
	screen.render();
    }
    
    // Public function (just the entry point)
    return {
	init: function() {
	    // Load the theme
	    var theme;
	    if (typeof process.theme != 'undefined') {
		theme = process.theme;
	    } else {
		theme = cli.theme;
	    }
	    
	    try {
		loadedTheme = require('./themes/' + theme + '.json');
	    } catch(e) {
		console.log('The theme \'' + theme + '\' does not exist.');
		process.exit(1);
	    }

	    var upgrading = false;
	    var doCheck = function() {
		upgrade.check(function(v) {
		    upgradeNotice = v;
		    attachHeader();
		});
	    };
	    
	    doCheck();
	    // Check for updates every 5 minutes
	    //setInterval(doCheck, 300000);

	    
	    // Create a screen object.
	    screen = blessed.screen();
	    
	    attachHeader();
	    attachFooter();

	    var plugins = ['cpu', 'memory', 'process'];
	    charts = [];
	    for(plugin in plugins) {
		charts.push({
		    place: plugins[plugin],
		    plugin: require('./sensors/' + plugins[plugin] + '.js'),
		    canvas: null,
		    values: [],
		    position: 0
		});
	    }

	    var layoutScripts = ['general-stats', 'advanced-memory'];
	    layouts = [];
	    for(i in layoutScripts) {
		layouts.push(
		    require('./layouts/' + layoutScripts[i] + '.js')
		);
	    }
	    currentLayout = 0;
	    layout = layouts[currentLayout];
	    
	    layoutPanels();
	    screen.on('resize', function() {
		layoutPanels();
		screen.render();
	    });	    

	    // Configure 'q', esc, Ctrl+C for quit
	    screen.on('keypress', function(ch, key) {
		if (
		    upgrading === false &&
			(
			    key.name === 'q' ||
				key.name === 'escape' ||
				(key.name === 'c' && key.ctrl === true)
			)
		) {
		    return process.exit(0);
		}

		if (key.name === 'u' && upgrading === false) {
		    upgrading = true;
		    
		    //processListSelection.detach();
		    program = blessed.program();
		    program.clear();
		    program.disableMouse();
		    program.showCursor();
		    program.normalBuffer();
		    
		    // @todo: show changelog  AND  smush existing data into it :D
		    upgrade.install('vtop', [
			{
			    'theme': theme
			}
		    ]);
		}
		
		if ((key.name =='left' || key.name == 'h') && graph_scale < 8) {
		    graph_scale *= 2;
		} else if ((key.name =='right' || key.name == 'l') && graph_scale > 0.125) {
		    graph_scale /= 2;
		}
	    });

	    setInterval(draw, 100);
	    
	    screen.render();
	}
    };
}();

App.init();
