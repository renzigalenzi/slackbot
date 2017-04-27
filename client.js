/**
 * Example for creating and working with the Slack RTM API.
 */

/* eslint no-console:0 */

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var Wolfram = require('node-wolfram');
var AuthDetails = require("./auth.json");
var YouTube = require('youtube-node');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var token = process.env.SLACK_API_TOKEN || '';
var jiraUser = process.env.JIRA_USER || '';
var jiraPassword = process.env.JIRA_PASSWORD || '';

var rtm = new RtmClient(token, { logLevel: 'error' });
var youTube = new YouTube();
var wolfram = new Wolfram(AuthDetails.wolfram_api_key);

console.log('Token:', token);
console.log('jiraUser:', jiraUser);
console.log('jiraPassword:', jiraPassword);

youTube.setKey(AuthDetails.youtube_api_key);
youTube.addParam('type', 'video');
rtm.start();


function PostMessage(message, channel) 
{
	if(message == null)
	{
		rtm.sendMessage("Could not complete request", channel);
		return;
	}
	
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

function ReactToMessage(message)
{
	var ReactionList = ["ok_hand", "+1", "-1", "upside_down_face", "neutral_face", "expressionless", "sunglasses", "simple_smile", "thumbsup_all"]
	var strReaction = ReactionList[Math.floor(Math.random() * (ReactionList.length -1))];
	var ReactionAPIURL = "https://slack.com/api/reactions.add?token="+token+"&name="+strReaction+"&channel="+message.channel+"&timestamp="+message.ts;
	
	var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
		{
            //good
		}
		else if (xmlHttp.readyState == 4)
		{
			console.log("error code " + xmlHttp.status +" received for request: " + ReactionAPIURL);
		}
    }
    xmlHttp.open("GET", ReactionAPIURL, true); // true for asynchronous 
    xmlHttp.send(null);
}


function DisplayHelp(message) 
{
	var Output = "Help List: \n";
	
	Output += "!help - Help \n";
	Output += "hello - Greetings \n";
	Output += "!calc {query} - calculate query using math and science \n";
	Output += "!name - Get my name \n";
	Output += "!about - About me \n";
	Output += "!cat - Yes. \n";
	Output += "!video - Youtube Search \n";
	Output += "!tickets {jira user alias} - get users current open tickets in jira \n";
	Output += "!google {query} - returns top 3 google results \n";
	Output += "!image {query} - google image result for query";
	
	PostMessage(Output, message.channel);
}

function YoutubeSearch(message) 
{
	youTube.search(message.text, 1, function(error, result) {
		if (error) {
			PostMessage(error, message.channel);
		}
		else if (!result || !result.items || result.items.length < 1 || !result.items[0].id || !result.items[0].id.videoId) {
			PostMessage("¯\\_(ツ)_/¯", message.channel);
		} 
		else {
			var YTlink = "http://www.youtube.com/watch?v=" + result.items[0].id.videoId;
			PostMessage(YTlink, message.channel);
		}
	});
}

function GoogleSearch(message, bImagesOnly)
{
	var query = message.text;
	
	if(query.trim().length == 0)
	{
		PostMessage("Tickets command Must give a user as an argument.", message.channel);
		return;
	}
	
	
	// We need this to build our post string
	var http = require("http");
	var fs = require("fs");
	
	var baseQuery = "https://www.googleapis.com/customsearch/v1?"
	var auth = "key="+ AuthDetails.google_custom_search_key +"&cx="+ AuthDetails.google_custom_search_engine;
	var filterString = bImagesOnly ? "&searchType=image" : "";
	var numResults = bImagesOnly ? "&num=1" : "&num=3";
	
	//https://www.googleapis.com/customsearch/v1?key=INSERT_YOUR_API_KEY&cx=017576662512468239146:omuauf_lfve&searchtype=image&num=1&q=query
	var EntireQuery = baseQuery + auth + "&q=" + (query.replace(/\s/g, '+')) + filterString + numResults;
	
	var strData = '';
	
	
	function ProcessData(data)
	{
		console.log("returned: " + data);
		var jsonData = JSON.parse(data);
		if(bImagesOnly)
		{
			jsonData.items.forEach(function(responseItem){
				if(responseItem.imageobject)
				{
					PostMessage(responseItem.imageobject[0].url, message.channel);
				}
				else if(responseItem.cse_image)
				{
					PostMessage(responseItem.cse_image[0].src, message.channel);
				}
				else if(responseItem.image)
				{
					PostMessage(responseItem.image.contextLink, message.channel);
				}
				else if(responseItem.cse_thumbnail)
				{
					PostMessage(responseItem.cse_thumbnail[0].src, message.channel);
				}
				else if(responseItem.pagemap)
				{
					if(responseItem.pagemap.imageobject)
					{
						PostMessage(responseItem.pagemap.imageobject[0].url, message.channel);
					}
					else if(responseItem.pagemap.cse_image)
					{
						PostMessage(responseItem.pagemap.cse_image[0].src, message.channel);
					}
					else if(responseItem.pagemap.image)
					{
						PostMessage(responseItem.pagemap.image.contextLink, message.channel);
					}
					else if(responseItem.pagemap.cse_thumbnail)
					{
						PostMessage(responseItem.pagemap.cse_thumbnail[0].src, message.channel);
					}
				}
				else
				{
					PostMessage("Sorry, I wasn't able to find the direct image link in this mess: " + JSON.stringify(responseItem), message.channel);
				}
			});
		}
		else
		{
			
			jsonData.items.forEach(function(responseItem){
				// replace html bolding with slack bolding
				PostMessage(responseItem.htmlTitle.replace(new RegExp("<b>", 'g'), "*").replace(new RegExp("</b>", 'g'), "*") + ":\n" + responseItem.link, message.channel);
			});
		}
	}
	
	var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
		{
            ProcessData(xmlHttp.responseText);
		}
		else if (xmlHttp.readyState == 4)
		{
			console.log("error code " + xmlHttp.status +" received for request: " + EntireQuery);
			PostMessage("error code " + xmlHttp.status +" received for request: " + EntireQuery, message.channel);
		}
    }
    xmlHttp.open("GET", EntireQuery, true); // true for asynchronous 
    xmlHttp.send(null);
}

function IsValidIssue(issue)
{
	//in the future we may want to do more than just a "does exist", so this is step by step
	var bValid = true;
	if(!issue){
		bValid = false;
	}
	if(bValid && !issue.key){
		bValid = false;
	}
	if(bValid && !issue.fields){
		bValid = false;
	}
	if(bValid && !issue.fields.summary){
		bValid = false;
	}
	
	return bValid;
}

function GetIssueOuput(issueNumber, issue)
{
	var Output = "[" + issueNumber + "]\n";
	
	Output += "Issue ID: " + issue.key + "\n";
	
	Output += "Details: " + issue.fields.summary + "\n";
	
	Output += "Status: " + issue.fields.status.name + ", ";
	
	Output += "Created : " + issue.fields.created + ", ";
	
	Output += "Last Updated: " + issue.fields.updated + ", ";
	
	Output += "Time Spent: " + issue.fields.aggregatetimespent/3600 + " hours \n\n";
	
	/*Object.getOwnPropertyNames(issue.fields.status).forEach(
	  function (val, idx, array) {
		console.log(val + ' -> ' + issue.fields.status[val]);
	  }
	);*/
	
	return Output;
}

function GetWork(message)
{
	var User = message.text;
	
	if(User.trim().length == 0)
	{
		PostMessage("Tickets command Must give a user as an argument.", message.channel);
		return;
	}
	// We need this to build our post string
	var https = require("https");
	var fs = require("fs");
	
	var auth = "Basic " + new Buffer(jiraUser + ":" + jiraPassword).toString("base64");
	
	var strData = '';

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
	                    
	
	//if we loop over the issues normally, we will print too quickly and cause slack to trash our spam.
	function IssueLoop (JsonData) {   
		
		var issuesOutput = ""; 
		var issueIndex = 1;
		JsonData.issues.forEach(function(issue) {
			if(IsValidIssue(issue))
			{
				issuesOutput += GetIssueOuput(issueIndex, issue);
				issueIndex++;
			}
		});
		PostMessage(issuesOutput, message.channel);
	};

	 // Set up the request
	 var post_req = https.request(post_options, function(res) {
		 
		res.on('data', function (chunk) {
			strData += chunk;
		});

		res.on('end', function () {
			var JsonData = JSON.parse(strData);
			
			if(JsonData.issues && JsonData.issues.length > 0){
				PostMessage("Request for "+User+" returned " + JsonData.issues.length + " tickets: \n", message.channel);
				
				IssueLoop(JsonData, JsonData.issues.length);
			}
			else {
				PostMessage("Request for "+User+" returned no tickets", message.channel);
			}
		});
	 });

	 // post the data
	 post_req.write(post_data);
	 post_req.end();

	}

	PostCode('assignee in ('+User+') AND STATUS not in (\"WORK COMPLETE\", \"Won\'t Fix\", \"On Hold\", \"QA Complete\", \"Approved\", \"Closed\")');
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
		PostMessage("My name is listed right above this message. I am not sure what else you want from me.", message.channel);
	}
	else if(message.text.includes("!about"))
	{
		message.text = message.text.replace("!about", "");
		PostMessage("I am a WIP bot being put together for fun to add helpful and fun options to slack. I will have bugs. ", message.channel);
	}
	else if(message.text.includes("!cat"))
	{
		message.text = message.text.replace("!cat", "");
		PostMessage("https://static.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg", message.channel);
	}
	else if(message.text.includes("hello"))
	{
		message.text = message.text.replace("hello", "");
		PostMessage("Hello Capsher Team, let me know if I can assist you. type !help for more options.", message.channel);
	}
	else if(message.text.includes("!tickets "))
	{
		message.text = message.text.replace("!tickets ", "");
		GetWork(message);
	}
	else if(message.text.includes("!google "))
	{
		message.text = message.text.replace("!google ", "");
		GoogleSearch(message, false);
	}
	else if(message.text.includes("!image "))
	{
		message.text = message.text.replace("!image ", "");
		GoogleSearch(message, true);
	}
}


rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  console.log('Message:', message);
  if(message.user != rtm.activeUserId && message.text && message.text.length > 0)
  {
	ProcessMessage( message );
  }
  //random chance to react to messages
  if(Math.random() < .15)
  {
	ReactToMessage(message);
  }
});

rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
  console.log('Reaction added:', reaction);
});

rtm.on(RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
  console.log('Reaction removed:', reaction);
});
