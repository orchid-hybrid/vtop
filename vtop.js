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
	    }
	}
    };
    
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
	    
	    // Create a screen object.
	    screen = blessed.screen();
	    
	    attachHeader();
	    attachFooter();

	    var plugins = ['cpu', 'memory', 'process'];
	    charts = [];
	    for(plugin in plugins) {
		charts.push({
		    place: plugins[plugin],
		    plugin: require('./sensors/' + plugins[plugin] + '.js')
		});
	    }

	    var layoutScripts = ['advanced-memory'/*, 'general-stats'*/];
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
	    
	    screen.render();
	}
    };
}();

App.init();
