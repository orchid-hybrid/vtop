/**
 * Panel Layout
 *
 * (c) 2014 James Hall
 */

var blessed = require('blessed');

var layout = {
    panels: {},
    // this is the table of panels attached to the screen itself
    // each entry has a container and content part
    // the container is the box itself that gets attached to the screen
    // the content is the widget that plugins will populate with information
    
    performLayout: function(loadedTheme, screen) {
	var vmid, hmid, hbot;

	wmid = Math.floor(screen.width/2);
	hmid = Math.floor((screen.height-2)/2);
	hbot = Math.floor(screen.height-1 - hmid);
	// subtract 2 from screen height for the header and footer
	
	graph = blessed.box({
	    top: 1,
	    left: 'left',
	    width: screen.width,
	    height: hmid-1,
	    // -1 so the border at the bottom doesn't overlap
	    // with the border at the top of the other panels
	    content: '',
	    fg: loadedTheme.chart.fg,
	    tags: true,
	    border: loadedTheme.chart.border
	});
	
	memoryGraph = blessed.box({
	    top: hmid,
	    left: 0,
	    width: wmid,
	    height: hbot,
	    content: '',
	    fg: loadedTheme.chart.fg,
	    tags: true,
	    border: loadedTheme.chart.border
	});
	
	processList = blessed.box({
	    top: hmid,
	    right: 0,
	    width: wmid,
	    height: hbot,
	    keys: true,
	    mouse: true,
	    fg: loadedTheme.table.fg,
	    tags: true,
	    border: loadedTheme.table.border
	});

	processListSelection = blessed.list({
	    height: hbot - 3,
	    top: 2,
	    width: wmid - 2,
	    left: 1,
	    keys: true,
	    vi: true,
	    search: function(jump) {
		// @TODO
		//jump('string of thing to jump to');
	    },
	    style: loadedTheme.table.items,
	    mouse: true
	});
	processList.append(processListSelection);
	
	layout.panels = {
	    cpu: {container: graph, content: graph},
	    memory: {container: memoryGraph, content: memoryGraph},
	    process: {container: processList, content: processListSelection},
	};
    }
};

module.exports = exports = layout;
