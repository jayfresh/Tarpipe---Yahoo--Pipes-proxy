/* Tarpipe / Yahoo! Pipes proxy

Description:
Allows you to process information in a Tarpipe workflow using a Yahoo! Pipe.

Usage:
Set proxy URL as serviceURL for a Tarpipe REST connector. Available query string parameters:
* pipeId (required) - the ID of the Yahoo! Pipe to use (the '_id' part of the URL on the pipe's page)
* postBinId - the unique ID of the PostBin to log activity to (http://postbin.org/<postBinId>)

*/

system.use("com.joyent.Sammy");
system.use("com.joyent.Resource");
system.use("org.json.json2");

function debug() {} // override by calling setDebug with a postbin ID to log to

function setDebug(postBinId) {
	debug = function(message) {
		system.http.request("POST","http://www.postbin.org/"+postBinId,['Content-Type','application/x-www-form-urlencoded'],message);
	}
}

function merge(obj1, obj2) {
	for(var i in obj2) {
		if(obj2.hasOwnProperty(i)) {
			obj1[i] = obj2[i];
		}
	}
}

function getParams(request) {
	var queryParams = request.query;
	var postParams = request.body;
	merge(queryParams,postParams);
	return queryParams;
}

function process(params) {
	if(params.data && params.pipeId) {
		var response = "";
		var dataString = params.data;
		debug('data POSTed to proxy='+encodeURIComponent(dataString));
	    var data = JSON.parse(dataString);
	    var pipeId = params.pipeId;
	    var responseObj = {
			items: [{
				title: "returned from Yahoo! Pipe at: "+pipeId,
				description: "",
				link: ""
			}]
		};
	    var items = data.items;
	    if(items) {
	        var url = "http://pipes.yahoo.com/pipes/pipe.run?_id="+pipeId+"&_render=json";
	        // Tarpipe only POSTs 1 item to this proxy
	        var encodedToPost = "title="+encodeURIComponent(items[0].title)+"&description="+encodeURIComponent(items[0].description);
	        debug(encodedToPost);
	        var pipeOutput = system.http.request("POST",url,['Content-Type','application/x-www-form-urlencoded'],encodedToPost);
	        debug('pipeOutput='+pipeOutput.content);
	        if(pipeOutput && pipeOutput.content) {
	            var content = JSON.parse(pipeOutput.content);
	            if(content) {
	                var value = content.value;
	                if(value.items[0].title) {
	                    responseObj.items[0].title = value.items[0].title;
					}
					if(value.items[0].description) {
	                    responseObj.items[0].description = value.items[0].description;
					}
	                if(value.items[0].link) {
	                	responseObj.items[0].link = value.items[0].link;
	                }
	                response = JSON.stringify(responseObj);
	            } else {
	                response = "bad result from Yahoo! Pipe at: "+pipeId;
	            }
	        } else {
	            response = "no result returned from Yahoo! Pipe";
	        }
	    } else {
	        response = "no items in data input";
	    }
	} else {
	    response = "no data or no pipe input";
	}
	debug("response="+response);
	return response;
}

GET("/", function() {
	return redirect("/index.html");
});

POST("/", function() {
	var response = "";
	var request = this.request;
	try {
		var method = request.method;
		debug(method);
		switch(method) {
			case "GET":
				response = displayInfo();
				break;
			case "POST":
				var params = getParams(request);
				if(params.postBinId) {
					setDebug(params.postBinId);
				}
				response = process(params);
				break;
			default: // PUT, DELETE, etc.
				response = "method not supported";
				break;
		}
	} catch(ex) {
		response = JSON.stringify(ex);
		debug(response);
	}
	return response;
});

/* test data for debugging:

1) Testing the proxy

when debugging, feel free to use this data (maybe you want to URL-encode the data):
   curl -d '<data>' 'http://f7e3dbf.smart.joyent.com/?pipeId=aa123a9b3d8c0a87e02ee579bdbf66ac'
   data: {"items":[{"title":"Fwd: notify.me [My Mobile Blog] - Hackspace @ The Hub","description":"","link":null}]}

this is that with the data URL-encodeded and inline
   curl -d 'data={"items":[{"title":"Fwd: notify.me [My Mobile Blog] - Hackspace @ The Hub","description":"hello %0A%0A%0A hello %0A%0A end","link":null}]}' 'http://f7e3dbf.smart.joyent.com/?pipeId=aa123a9b3d8c0a87e02ee579bdbf66ac'

2) Testing the Yahoo! Pipe

here's a long example of POSTing straight to pipes (with data URL-encoded):

curl -d "description=%3Cbr%3E%3Cbr%3E%3Cdiv%20class%3D%22gmail_quote%22%3E----------%20Forwarded%20message%20----------%3Cbr%3EFrom%3A%20%3Cb%20class%3D%22gmail_sendername%22%3Enotify.me%3C%2Fb%3E%20%3Cspan%20dir%3D%22ltr%22%3E%26lt%3Bno_reply4%40notify.me%26gt%3B%3C%2Fspan%3E%3Cbr%3EDate%3A%20Thu%2C%20Jul%2023%2C%202009%20at%209%3A37%20PM%3Cbr%3ESubject%3A%20notify.me%20%5BMy%20Mobile%20Blog%5D%20-%20Hackspace%20%40%20The%20Hub%3Cbr%3E%0ATo%3A%20%3Ca%20href%3D%22mailto%3Ajnthnlstr%40googlemail.com%22%3Ejnthnlstr%40googlemail.com%3C%2Fa%3E%3Cbr%3E%3Cbr%3E%3Cbr%3E%0A%3Cdiv%3E%0A%3Cdiv%3E%3Ca%20href%3D%22http%3A%2F%2Fc.notify.me%2FM5seAw%22%20target%3D%22_blank%22%3EHackspace%20%40%20The%20Hub%3C%2Fa%3E%3C%2Fdiv%3E%0A%3Cdiv%3E%3Cdiv%3E%3Cbr%3E%3Cspan%3ENice%3C%2Fspan%3E%3Cbr%3E%3C%2Fdiv%3E%3Cdiv%3E%3C%2Fdiv%3E%3Cdiv%20style%3D%22padding%3A%2010px%3B%20background-color%3A%20rgb(42%2C%2053%2C%2064)%3B%20margin-top%3A%2025px%3B%20color%3A%20rgb(255%2C%20255%2C%20255)%3B%22%3E%20%3Cspan%20style%3D%22font-size%3A%2024px%3B%22%3Enotify.me%3C%2Fspan%3E%3Cspan%20style%3D%22font-size%3A%2014px%3B%20padding-left%3A%2010px%3B%22%3Ealways%20connected...%3C%2Fspan%3E%3C%2Fdiv%3E%0A%0A%3Cdiv%20style%3D%22padding-top%3A%205px%3B%22%3E%3Ca%20href%3D%22http%3A%2F%2Fwww.notify.me%2Fuser%2Fsource%2Flist%22%20target%3D%22_blank%22%3EManage%3C%2Fa%3E%20Notification%20Settings%3C%2Fdiv%3E%0A%3C%2Fdiv%3E%0A%3C%2Fdiv%3E%3C%2Fdiv%3E%3Cbr%3E%3Cbr%20clear%3D%22all%22%3E%3Cbr%3E--%20%3Cbr%3Et%3A%20%40jayfresh%3Cbr%3Eb%3A%20%3Ca%20href%3D%22http%3A%2F%2Fwww.jaybyjayfresh.com%22%3Ehttp%3A%2F%2Fwww.jaybyjayfresh.com%3C%2Fa%3E%3Cbr%3E%0A%0A" 'http://pipes.yahoo.com/pipes/pipe.run?_id=vIDYRjd43hGSH2BtKH1_0w&_render=json'

This is the data above decoded:

"description=<br><br><div class=\"gmail_quote\">---------- Forwarded message ----------<br>From: <b class=\"gmail_sendername\">notify.me<\/b> <span dir=\"ltr\">&lt;no_reply4@notify.me&gt;<\/span><br>Date: Thu, Jul 23, 2009 at 9:37 PM<br>Subject: notify.me [My Mobile Blog] - Hackspace @ The Hub<br>\nTo: <a href=\"mailto:jnthnlstr@googlemail.com\">jnthnlstr@googlemail.com<\/a><br><br><br>\n<div>\n<div><a href=\"http:\/\/c.notify.me\/M5seAw\" target=\"_blank\">Hackspace @ The Hub<\/a><\/div>\n<div><div><br><span>Nice<\/span><br><\/div><div><\/div><div style=\"padding: 10px; background-color: rgb(42, 53, 64); margin-top: 25px; color: rgb(255, 255, 255);\"> <span style=\"font-size: 24px;\">notify.me<\/span><span style=\"font-size: 14px; padding-left: 10px;\">always connected...<\/span><\/div>\n\n<div style=\"padding-top: 5px;\"><a href=\"http:\/\/www.notify.me\/user\/source\/list\" target=\"_blank\">Manage<\/a> Notification Settings<\/div>\n<\/div>\n<\/div><\/div><br><br clear=\"all\"><br>-- <br>t: @jayfresh<br>b: <a href=\"http:\/\/www.jaybyjayfresh.com\">http:\/\/www.jaybyjayfresh.com<\/a><br>\n\n"

*/