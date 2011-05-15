# Proxy Logger

Proxy logger is tool that helps to see http content passing through different servers, via a web browser. Content can be xml, json, images, or whatever.

Lets say you are on a team (A) and need to consume services made by another team (B). 
You are using a form of abstraction for the soap web services, an auto-generated clases for invoking them.

Things does not work, and team (B) asks you for the message you are sending, to replicate the problem.

What could do you do?

* Serialize the abstract object that has the data, just before invoking the web method.
  Problem -> The xml string you get is not exactly the one that get passed throught.

* Use socat with verbose or something similar and let it print the message to the terminal.
  Problem -> If your not on a unix mashine, you will need to have a remote user/pass to one. Not all people are good with or like terminals.  Plus, you need to manually separate the request and response and copy/paste them to separate files.
             
* Use tcpmon.
  Problem -> It gets slow when working with big xml data.

Now you can use proxy_logger. Its handy becouse it can open each request or response in a new tab in the browser. 
If you install a xml formatter, you can easily interact with the content.

# TODO

* memory.js line 24: Could apply hands-on-node page 59 to async write to the file.
* app.js    line 83: Rewrite

# Usage 

Execute it on a server.
<pre>
 $ node app.js 
 [Info ] Starting proxy on :9099, control on :8099
</pre>

By default it will start the http proxy on port 9099, and the control port on 8099.
Now, you can configure your client to use it. For example when running  <pre> curl --proxy http://localhost:9099 http://google.com </pre> or when invoking a remote soap web service throught proxy_logger, you will see something like this: 

<img src = "http://i.imgur.com/oJaMs.png" />

The yellow bulb shows your connected. For each request you see the time and date it was thrown, the kbytes and seconds it took getting the response. The mime type and finally the html verb and url.
When moving the mouse over the green arrows, you will see the http headers. When clicking the arrows, a new tab will open in the browser with the content. You can just save it to file with Ctl+s and drop it in a mail to someone.



# About

Proxy_logger was quickly made to help the team have visibility about whats going on. If you hate it, love it or just use it, please tell!!..

It requires node.js with socket.io and mime.

