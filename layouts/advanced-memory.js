/**
 * Panel Layout
 *
 * (c) 2014 James Hall
 */

var blessed = require('blessed');

var layout = {
    panels: {},
    
    performLayout: function(loadedTheme, screen) {
	var h1, h2, h3;
	var wmid;

	h1 = Math.floor((screen.height-2)*1/4);
	h2 = Math.floor((screen.height-2)*2/4);
	h3 = Math.floor((screen.height-2)*3/4);
	
	wmid = Math.floor(screen.width*2/3);
	wsize = Math.floor(screen.width*1/3);
	
	mem0 = blessed.box({
	    top: 1,
	    left: 0,
	    width: wmid,
	    height: h1,
	    content: '',
	    fg: loadedTheme.chart.fg,
	    tags: true,
	    border: loadedTheme.chart.border
	});
	mem1 = blessed.box({
	    top: h1+1,
	    left: 0,
	    width: wmid,
	    height: h2-h1,
	    content: '',
	    fg: loadedTheme.chart.fg,
	    tags: true,
	    border: loadedTheme.chart.border
	});
	mem2 = blessed.box({
	    top: h2+1,
	    left: 0,
	    width: wmid,
	    height: h3-h2,
	    content: '',
	    fg: loadedTheme.chart.fg,
	    tags: true,
	    border: loadedTheme.chart.border
	});
	mem3 = blessed.box({
	    top: h3+1,
	    left: 0,
	    width: wmid,
	    height: screen.height-2-h3,
	    content: '',
	    fg: loadedTheme.chart.fg,
	    tags: true,
	    border: loadedTheme.chart.border
	});
	
	processList = blessed.box({
	    top: 1,
	    left: wmid,
	    width: wsize,
	    height: screen.height - 2,
	    keys: true,
	    mouse: true,
	    fg: loadedTheme.table.fg,
	    tags: true,
	    border: loadedTheme.table.border
	});

	processListSelection = blessed.list({
	    height: screen.height - 4,
	    top: 1,
	    width: wsize - 2,
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
	    memory0: {container: mem0, content: mem0},
	    memory1: {container: mem1, content: mem1},
	    memory2: {container: mem2, content: mem2},
	    memory3: {container: mem3, content: mem3},
	    process: {container: processList, content: processListSelection},
	};
    }
};

module.exports = exports = layout;
