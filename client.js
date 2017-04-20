/**
 * Example for creating and working with the Slack RTM API.
 */

/* eslint no-console:0 */

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var Wolfram = require('node-wolfram');
var AuthDetails = require("./auth.json");
var YouTube = require('youtube-node');

var token = process.env.SLACK_API_TOKEN || '';

var rtm = new RtmClient(token, { logLevel: 'debug' });
var youTube = new YouTube();
var wolfram = new Wolfram(AuthDetails.wolfram_api_key)


youTube.setKey(AuthDetails.youtube_api_key);
rtm.start();

function objToString (obj) {
    var str = '';
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str += p + '::' + obj[p] + '\n';
        }
    }
    return str;
}


function PostMessage(message, channel) 
{
	var messages = [];
	var i = 0;
	do
	{
		messages[i] = message.substring(0,3000);
		message = message.substring(3000);
		i++;
	} while(message.length > 0)
	
	messages.forEach(function(snippet) {
		rtm.sendMessage(snippet, channel);
	});
}


function DisplayHelp(message) 
{
	var Output = "Help List: \n";
	
	Output += "!help - Help \n";
	Output += "hello - Greetings \n";
	Output += "!calc - calculate rest of text \n";
	Output += "!name - Get my name \n";
	Output += "!about - About me \n";
	Output += "!cat - Yes. \n";
	Output += "!video - Youtube Search";
	
	PostMessage(Output, message.channel);
}

function YoutubeSearch(message) 
{
	youTube.search(message.text, 1, function(error, result) {
		if (error) {
			PostMessage(error, message.channel);
		}
		else if (!result || !result.items || result.items.length < 1) {
			PostMessage("¯\\_(ツ)_/¯", message.channel);
		} 
		else {
			var YTlink = "http://www.youtube.com/watch?v=" + result.items[0].id.videoId;
			PostMessage(YTlink, message.channel);
		}
	});
}

function PrintIssue(issue, message)
{
	var Output = "Issue ID: " + issue.inwardIssue.key + " \n";
	
	Output += "Details: " + issue.inwardIssue.fields.summary + " \n\n";

	PostMessage(Output, message.channel);
}

function GetWork(message)
{
	// We need this to build our post string
	var https = require("https");
	var fs = require("fs");
	//Add username and password here
	var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");


	function PostCode(codestring) {
	 // Build the post string from an object
	 var post_data = JSON.stringify({
		 'jql' : codestring,
		 'maxResults': 50,
		 'startAt': 0
	 });

	 // An object of options to indicate where to post to
	 var post_options = {
		 host: "capsher.atlassian.net",
		 path: "/rest/api/latest/search",
		 method: "POST",
		 headers: {
			 "Authorization": auth,
			 "Content-Type": "application/json"
		 }
	 };

	 // Set up the request
	 var post_req = https.request(post_options, function(res) {
		 res.on("data", function (chunk) {
			var chunkJsonData = JSON.parse(chunk.toString());
			PostMessage('chunk to string: ' + objToString(chunkJsonData), message.channel);
			chunkJsonData.forEach(function(issue) {
				PostMessage('issue to string: ' + objToString(issue), message.channel);
				PrintIssue(issue, message);
			});
		 });
	 });

	 // post the data
	 PostMessage('post_data = ' + post_data, message.channel);
	 post_req.write(post_data);
	 post_req.end();

	}

	PostCode('assignee in (lelliott) AND STATUS not in (\"WORK COMPLETE\", \"Closed\")');
}

function WolframQuery(message) {
	wolfram.query(message.text, function(error, result) {
			if (error) {
				console.log(error);
				PostMessage("Couldn't talk to Wolfram Alpha :(", message.channel);
			} else {
				console.log(JSON.stringify(result));
				var response = "";
				if(result.queryresult.$.success == "true"){
					if(result.queryresult.hasOwnProperty("warnings")){
						for(var i in result.queryresult.warnings){
							for(var j in result.queryresult.warnings[i]){
								if(j != "$"){
									try {
										PostMessage(result.queryresult.warnings[i][j][0].$.text, message.channel);
									} catch(e){
										console.log("WolframAlpha: failed displaying warning:\n"+e.stack());
									}
								}
							}
						}
					}
					if(result.queryresult.hasOwnProperty("assumptions")){
						for(var i in result.queryresult.assumptions){
							for(var j in result.queryresult.assumptions[i]){
								if(j == "assumption"){
									try {
										PostMessage(`Assuming ${result.queryresult.assumptions[i][j][0].$.word} is ${result.queryresult.assumptions[i][j][0].value[0].$.desc}`, message.channel);
									} catch(e) {
										console.log("WolframAlpha: failed displaying assumption:\n"+e.stack());
									}
								}
							}
						}
					}
					if(result && result.queryresult && result.queryresult.pod)
					{
						for(var a=0; a<result.queryresult.pod.length; a++)
						{
							var pod = result.queryresult.pod[a];
							response += "**"+pod.$.title+"**:\n";
							for(var b=0; b<pod.subpod.length; b++)
							{
								var subpod = pod.subpod[b];
												//can also display the plain text, but the images are prettier
								/*for(var c=0; c<subpod.plaintext.length; c++)
								{
									response += '\t'+subpod.plaintext[c];
								}*/
												for(var d=0; d<subpod.img.length;d++)
												{
													response += "\n" + subpod.img[d].$.src;
													PostMessage(response, message.channel);
													response = "";
												}
							}
										response += "\n";
						}
					}
					else{
						PostMessage("¯\\_(ツ)_/¯", message.channel);
					}
				}	else {
					if(result.queryresult.hasOwnProperty("didyoumeans")){
						var msg = [];
						for(var i in result.queryresult.didyoumeans){
							for(var j in result.queryresult.didyoumeans[i].didyoumean) {
								msg.push(result.queryresult.didyoumeans[i].didyoumean[j]._);
							}
						}
						PostMessage("Did you mean: " + msg.join(" "), message.channel);
					} else {
						PostMessage("No results from Wolfram Alpha :(", message.channel);
					}
				}
			}
		});
};


function ProcessMessage(message) 
{
	if(message.text.includes("!h"))
	{
		message.text = message.text.replace("!h", "");
		DisplayHelp(message);
	}
	else if(message.text.includes("!video"))
	{
		message.text = message.text.replace("!video", "");
		YoutubeSearch(message);
	}
	else if(message.text.includes("!calc"))
	{
		message.text = message.text.replace("!calc", "");
		
		WolframQuery(message);
	}
	else if(message.text.includes("!name"))
	{
		message.text = message.text.replace("!name", "");
		PostMessage("My name es JEFF", message.channel);
	}
	else if(message.text.includes("!about"))
	{
		message.text = message.text.replace("!about", "");
		PostMessage("This is the about me section", message.channel);
	}
	else if(message.text.includes("!cat"))
	{
		message.text = message.text.replace("!cat", "");
		PostMessage("https://static.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg", message.channel);
	}
	else if(message.text.includes("hello"))
	{
		message.text = message.text.replace("hello", "");
		PostMessage("Sup Homies", message.channel);
	}
	else if(message.text.includes("!ticket"))
	{
		message.text = message.text.replace("!ticket", "");
		GetWork(message);
	}
}


rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  console.log('Message:', message);
  if(message.user != rtm.activeUserId && message.text && message.text.length > 0)
  {
	ProcessMessage( message );
  }
});

rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
  console.log('Reaction added:', reaction);
});

rtm.on(RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
  console.log('Reaction removed:', reaction);
});
