String.prototype.format = function(hash) {
	if (arguments.length<1) return "No arguments :(";
	my = this.toString();
	var matches = this.match(/\{(\w\.*)+\}/g);
	matches.forEach(function(match) {
		var key = match.substr(1, match.length-2);
		
		var value = hash[key]||'';

		//Just need 2 levels, so hardcode it :P
		if (key.indexOf('.')>0) {
			var k1 = key.split('.')[0];
			var k2 = key.split('.')[1];
			value = hash[k1] == null ? '' : hash[k1][k2] || '';
		}
		
		my = my.replace( eval('/'+match+'/g'), value);
	});
	return my;
}

app = {
	init: function() {
		app.statusEl= $('status');
		app.logsEl = $('logs');
		app.setStatus(false);
		app.initSocket();
	},
	
	clean: function() {
		app.logsEl.innerHTML='';
	},


	initSocket: function() {
		app.io = new io.Socket();
		app.io.on('connect', app.onConnect);
		app.io.on('disconnect', app.onDisconnect);
		app.io.on('message', app.onMessage);
		app.io.connect();
	},

	onConnect: function() {
		app.setStatus(true);
	},

	sleep: {min: 1, max: 10, current: 0},
	onDisconnect: function() {
		app.setStatus(false);
		setTimeout(function() {
			if (app.io.connected || app.io.connecting)
				return;
			if (app.sleep.current<app.sleep.max)
				app.sleep.current += 1;
			app.io.connect();
			setTimeout(arguments.callee, app.sleep.current*1000)
		}, app.sleep.min);
	},

	setStatus: function(bool) {
		app.statusEl.src = bool? 'img/online.png': 'img/offline.png';
	},

	pause: false,
	togglePause: function() {
		app.pause = !app.pause;
		$('pause').disabled = app.pause;
		$('play').disabled = !app.pause;
	},
	
	toggleFilter: function() {	
		var hidden = $('filterWindow').className.indexOf('show') <0 ;
		$('filterWindow').className = hidden? 'window drop-shadow show': 'window';
	},
	
	toggleStats: function() {
		var hidden = $('statsWindow').className.indexOf('show') <0 ;
		$('statsWindow').className = hidden? 'window drop-shadow show': 'window';
	},
	
	statsStart: function() {
		var key = $('statsKey').value;
		app.io.send({type: 'stats', key: key});
	},
	
	filter: function(msg) {
		var key = $('filterKey').options[$('filterKey').selectedIndex].value
		if (key==null) return;

		var val = $('filterValue').value.trim();
		if (val.length<1) return false;
		
		return msg[key].indexOf(val)==-1
	},
	
	onMessage: function(msg) {
		if (app.pause || app.filter(msg)) return;
		
		//present repeated msg's.
		if (msg.state=='request' && msg.id != null && msg.id <= app.lastRequestId)
			return;
			
		app[msg.state+'Event'](msg);
	},
	
	errorEvent: function(msg) {
		app.requestEvent(msg);
		app.responseEvent(msg);
	},
	
	statsEvent: function(msg) {
		var html = prettyPrint(msg.data);
		msg.humanDate = helper.humanTime(new Date(msg.date));
		msg.firstHuman = helper.humanDateTime(new Date(msg.first));
		msg.lastHuman = helper.humanDateTime(new Date(msg.last));
		
		var csv = [[$('statsKey').value, 'Total', 'Avg', 'Std']];
		csv.push(['All', msg.total, '100', '']);
		for (var k in msg.data) {
			if (!msg.data.hasOwnProperty(k)) return;
			csv.push([k, msg.data[k].total, msg.data[k].avg, msg.data[k].std])
		}
		csv = helper.array2Csv(csv).replace(/"/g, '');

		$('statsContent').innerHTML = "<div style='width: 100%'>[{humanDate}]  <b>Total</b> {total}, <b>from</b> {firstHuman} <b>to</b> {lastHuman}  &nbsp;&nbsp;&nbsp; <img src='img/csv.png' style='float: right' onclick=\" helper.openNewWindow(\'".format(msg) + csv + "\'); return false;\" /></div>" + html.innerHTML;
	},
	
	lastRequestId: 0,
	requestEvent: function(msg) {
		if ($('download_'+msg.id)!=null) return; //this happends when client stays still, and server restarts
		
		var html = build.requestMsg(msg);
		app.logsEl.insertBefore(html, app.logsEl.firstChild);
		app.lastRequestId = msg.id;
	},
	
	responseEvent: function(msg) {
	
		var tr = $(msg.id);
		
		if (tr==null) {
			console.log('hmm...', msg);
			return;
		}
		var down = tr.getElementsByClassName('download')[0].children[0];
		down.children[1].innerHTML = build.tooltip(msg.response, true);
		var downImg = down.children[0];
		downImg.src = 'img/download.png';
		downImg.onclick = function() {window.open(msg.response._fileName); return false};
		
		tr.getElementsByClassName('took')[0].innerText = msg.took+ ' s';
		tr.getElementsByClassName('size')[0].innerText = msg.response.size+ ' KB';
		tr.getElementsByClassName('result')[0].innerText = "{statusCodeDescr} ({statusCode})".format(msg);

		var tooltip = tr.getElementsByClassName('dest')[0].children[0].children[0];
		tooltip.innerHTML = build.tooltip(msg);
	
		$('state_'+msg.id).src= msg.statusCode == 200 && !msg.response.isSoapFault ? 'img/ok.png' : 'img/error.png';
	}	
};

build = {
	tooltip: function(msg, recursive) {
		var html = '';
		for (var i in msg) { 
			if (!msg.hasOwnProperty(i) || i=='data' || i=='parsedUrl' || i[0]=='_') 
				continue; 
				
			if (typeof recursive == 'undefined' && typeof msg[i] == 'object')
				continue;
			
			var value = msg[i];
			if (recursive && typeof msg[i] == 'object')
				value = build.tooltip(value);
			
			
			html += '<tr><th style="white-space:nowrap;">' + i[0].toUpperCase() + i.substring(1,i.length) + '</th><td style="white-space:nowrap;">' + value + '</td></tr>';
		}

		return '<table>'+html+'</table>';
	},

	requestIdx: 1,
	requestMsg: function(msg) {
	
		var div = document.createElement('tr');
		
		var t = new Date(msg.startTime);
		msg.startTimeHuman = helper.humanTime(t);
		msg.startDateHuman = helper.humanDate(t);
		msg._idx = build.requestIdx;
		msg.request._tooltip = build.tooltip(msg.request, true);
		msg.response._tooltip = build.tooltip(msg.response, true);
		msg._tooltip = build.tooltip(msg);
		build.requestIdx += 1;
		
		div.setAttribute('class', build.requestIdx%2 ? 'odd' : 'even');
		div.setAttribute('id', msg.id);
		div.innerHTML = templates.newRow.format(msg);
		
		return div;
	},

}


var templates = {

	newRow : "\
			<td class='idx'>{_idx}</td>\
	        <td class='time'>\
				<span class='tooltip'>\
					{startTimeHuman}\
					<span>{startDateHuman}</span>\
				</span>\
			</td>\
	        <td class='origin'>{request.remoteAddress}</td>\
			<td class='upload'>\
				<span class='tooltip'>\
					<img src='img/upload.png' onclick=\"window.open('{request._fileName}');return false;\" />\
					<span>{request._tooltip}</span>\
				</span>\
			</td>\
			<td class='download'>\
				<span class='tooltip'>\
					<img src='img/loading.gif'/>\
					<span>{response._tooltip}</span>\
				</span>\
			</td>\
	        <td class='size'>{request.size} KB</td>\
	        <td class='took'>{request.took} s</td>\
			<td class='state'><img id='state_{id}' src='img/loading.gif' /></td>\
	        <td class='result'></td>\
			<td class='mime'>{mimeTypeExtension}</td>\
			<td class='dest'>\
				<span class='tooltip'>{method}<span>{_tooltip}</span></span> \
				<a href='{url}' target='_blank'>{url}</a> \
			</td>",
}

var helper = {
	
	openNewWindow: function(data) {
		
		var w = window.open('',new Date().getTime()+'',
				'width=350,height=250'
				+',menubar=0'
				+',toolbar=1'
				+',status=0'
				+',scrollbars=1'
				+',resizable=1');
				
		w.document.writeln(data); //'<html><head><title>Console</title></head>'
		w.document.close();
	},
	
 	array2Csv: function(arr) {
		var txt = '';
		arr.forEach(function(row) {
			row.forEach(function(el) {
				txt += el +';';
			});
			txt = txt.substr(0, txt.length-1) + "<br/>"
		});
		
		return txt;
	},
	
	humanDate: function(d) {
		if (typeof d == 'undefined')
	    	d = new Date();

		return d.getFullYear() + '-' + helper.twoDigits(d.getMonth() + 1) + '-' + helper.twoDigits(d.getDate());	
	},
	
	humanTime: function(d) {
			if (typeof d == undefined)
	        	d = new Date();
	        return helper.twoDigits(d.getHours()) + ':' + helper.twoDigits(d.getMinutes()) + ':' + helper.twoDigits(d.getSeconds());
	},
	
	humanDateTime: function(d) {
		return helper.humanDate(d) + ' ' + helper.humanTime(d);
	},
	
	twoDigits: function(num) {
		if (num<10)
			return '0'+num;
		else
			return num;
	}
	
}


function $(id) {
	return document.getElementById(id);
}
