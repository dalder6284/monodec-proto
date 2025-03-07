# Real-Time Performance Control (RTPC)

RTPC (Real-Time Performance Control) is a WebSocket-based system designed for synchronizing mobile nodes in networked audiovisual performances. Using a centralized Node.js WebSocket server, RTPC enables audience members’ mobile devices to receive BPM updates, synchronize timing, and execute visual or auditory cues in real-time.

## Installation & Setup
1. Clone the Repository
```
git clone https://github.com/dalder6284/monodec-proto.git
cd monodec-proto
```

3. Install dependencies
Make sure you have Node.js installed, then run
`node install`

5. Run the WebSocket Server
`node server.js`
This will start the server. The website can be seen on the `localhost:3000`, or at least the default port is 3000, but you are welcome to change that.

## Using the administrator control

Once the WebSocket server is running, you should just be able to run the Python script. Make sure you have Python installed. The instructions are in the console prompt it gives you!
