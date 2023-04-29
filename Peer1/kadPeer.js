//Get required libraries and files 
const net = require("net");
const singleton = require('./singleton');
const kadPTPPacket = require("./kadPTPPacket");
net.bytesWritten = 300000;
net.bufferSize = 300000;

//create the server
const kadPeer = net.createServer();

//Used to handle the server side element of a peer
kadPeer.on("connection", (socket) => {

    //Used to check if a peer is connecting to get welcome packet or is sending hello packet
    let socketClosed = false;

    //Called every time peer gets data
    socket.on("data", packet => {

        //Socket must be closed after data is sent, this doesn't close the main socket
        socketClosed = true;

        //Set up dht
        let dht = [];
        let dhtElement = {
            ip: "",
            port: 0,
            id: "",
        }

        //Build dht from hello packet
        for (let i = 0; i < parseInt(parseBitPacket(packet, 12, 8)); i++) {
            let ip = "";
            for (let j = 0; j < 4; j++) {
                if (j == 3) {
                    ip += parseBitPacket(packet, 32 + (48 * i) + (parseInt(parseBitPacket(packet, 20, 12)) * 8) + (8 * j), 8);
                }
                else {
                    ip += parseBitPacket(packet, 32 + (48 * i) + (parseInt(parseBitPacket(packet, 20, 12)) * 8) + (8 * j), 8) + ".";
                }

            }

            //Make temp dht in array
            dhtElement.ip = ip;
            dhtElement.port = parseBitPacket(packet, 64 + (parseInt(parseBitPacket(packet, 20, 12)) * 8) + (48 * i), 16);
            dhtElement.id = singleton.generatePeerID(dhtElement.ip, dhtElement.port);
            dht.push(dhtElement);
        }

        singleton.setDHT(refreshBuckets(singleton.getDHT(), dht));  //Call refresh buckets using the dht recieved from helloPacket
        socket.end();   //close
    });

    socket.on("error", err => {
        console.log(err);
    });

    //Used to determine if socket is meant to send welcome packet or recieve data, if no data is recieved in 5 seconds the socket doesn't end so it knows to send welcome packet
    setTimeout(() => {
        if (!socketClosed) {
            console.log("Connected from peer " + socket.remoteAddress + ":" + (socket.remotePort - 1));
            socket.write(kadPTPPacket.getPacket(1, singleton.getDHT().filter(element => element !== null).length, singleton.getPeerName(), singleton.getDHT().filter(element => element !== null).map(element => element.ip), singleton.getDHT().filter(element => element !== null).map(element => element.port)));
        }
    }, 5000);
});

//Checks if kadPeer is run as with p flag to indicate to program we want to connecct to another peer
if (process.argv.slice(2)[0] == "-p") {

    //Get the ip and port that peer wants to connect to
    const targetIP = process.argv.slice(2)[1].split(":")[0];
    const targetPort = process.argv.slice(2)[1].split(":")[1];

    //Since it also needs to act as a server, it listens on an ephmeral port with localhost ip
    kadPeer.listen(0, "127.0.0.1", () => {
        singleton.init(kadPeer.address().address, kadPeer.address().port, process.cwd().split("\\")[process.cwd().split("\\").length - 1]); //Initialize singleton with specific peer data, unique to peer running kadPeer
        const socket = new net.Socket();    //Create socket used to connect to other peer
        socket.connect(targetPort, targetIP, () => {    //Use the ip and port entered in terminal to connect to another peer
            socket.on("data", packet => {   //Entered when peer recieves welcome packet from another peer
                (async () => {

                    //Set up variables to parse dht recieved from welcome packet
                    let dhtString = "[]";
                    let dht = [];
                    let dhtElement = {
                        ip: "",
                        port: 0,
                        id: "",
                    }

                    //Display info on terminal
                    console.log("Connected to " + bytesToString(packet.slice(4, 4 + parseInt(parseBitPacket(packet, 20, 12)))) + ":" + targetPort + " at timestamp: " + singleton.getTimestamp());
                    console.log("This peer address is " + kadPeer.address().address + ":" + kadPeer.address().port + " located at " + singleton.getPeerName() + " [" + singleton.getPeerID() + "]");

                    //Loop over all ips recieved in welcome packet and build dht
                    for (let i = 0; i < parseInt(parseBitPacket(packet, 12, 8)); i++) {
                        let ip = "";
                        if (i == 0) {
                            dhtString = "";
                        }

                        //Build ip address
                        for (let j = 0; j < 4; j++) {
                            if (j == 3) {
                                ip += parseBitPacket(packet, 32 + (48 * i) + (parseInt(parseBitPacket(packet, 20, 12)) * 8) + (8 * j), 8);
                            }
                            else {
                                ip += parseBitPacket(packet, 32 + (48 * i) + (parseInt(parseBitPacket(packet, 20, 12)) * 8) + (8 * j), 8) + ".";
                            }

                        }

                        //Put dht in temp array that will call refreshBuckets later
                        dhtElement.ip = ip;
                        dhtElement.port = parseInt(parseBitPacket(packet, 64 + (parseInt(parseBitPacket(packet, 20, 12)) * 8) + (48 * i), 16));
                        dhtElement.id = singleton.generatePeerID(dhtElement.ip, dhtElement.port);
                        dht.push(dhtElement);

                        //Build string to display on terminal
                        dhtString += "[" + ip + ":" + dhtElement.port + ", " + singleton.generatePeerID(ip, dhtElement.port) + "]\n\t\t";
                    }

                    //Display dht recieved in welcome packet
                    console.log(("Recieved Welcome message from " + bytesToString(packet.slice(4, 4 + parseInt(parseBitPacket(packet, 20, 12))))) + " \n\nalong with DHT: " + dhtString);

                    //Add the peer that sender is trying to connect to into dht if it doesn't already exist
                    if (!singleton.getDHT().includes(singleton.generatePeerID(targetIP, targetPort))) {
                        singleton.setDHT(pushBucket(singleton.getDHT(), { ip: targetIP, port: targetPort, id: singleton.generatePeerID(targetIP, targetPort) }));
                    }

                    singleton.setDHT(refreshBuckets(singleton.getDHT(), dht));  //Perform refresh buckets method to modify peers existing dht

                    console.log("Refresh k-Bucket operation is performed");

                    let myDHT = "[]";

                    //Loop over dht and convert it into a string to display to the peer in terminal
                    for (let i = 0; i < singleton.getDHT().filter(element => element !== null).length; i++) {
                        if (i == 0) {
                            myDHT = "";
                        }
                        myDHT += "[" + singleton.getDHT().filter(element => element !== null)[i].ip + ":" + singleton.getDHT().filter(element => element !== null)[i].port + ", " + singleton.getDHT().filter(element => element !== null)[i].id + "]\n\t";
                    }


                    console.log("My DHT: " + myDHT);

                    //Use the peers dht to send hello packet of itself to all peers in its dht
                    await sendHello(singleton.getDHT().filter(element => element !== null));
                    console.log("Hello packet has been sent.");
                    socket.end();   //Close this peers connection
                })();
            });
        });
    });
}

else {
    //If no argument is provided just create a server, initialize singleton and display info about the peer. When this is done this peer can only recieve connections, it can't connect to other peers but other peers can connect to it
    kadPeer.listen(0, "127.0.0.1", () => {
        singleton.init(kadPeer.address().address, kadPeer.address().port, process.cwd().split("\\")[process.cwd().split("\\").length - 1]);
        console.log("This peer address is " + kadPeer.address().address + ":" + kadPeer.address().port + " located at " + singleton.getPeerName() + " [" + singleton.getPeerID() + "]");
    });
}

const pushBucket = (T, P) => {
    // Get the binary representation of both peer IDs
    const P_binary = Hex2Bin(P.id);
    const T_binary = Hex2Bin(singleton.getPeerID());

    // Determine the maximum number of leftmost bits shared between P and P′
    let n = leftMostBits(P_binary, T_binary);

    // If the nth k-bucket in T is null, insert P into the nth k-bucket
    if (!T[n]) {
        T[n] = P;
    }
    // If the nth k-bucket is full, determine which of the peers P and N is the closet
    else {
        const N = T[n] // Get peer N that is already in that bucket
        const P_distance = XORing(P_binary, T_binary);
        const N_distance = XORing(N.id, T_binary);

        // If P is closer than what is already in that bucket, replace it with P
        if (P_distance < N_distance) {
            T[n] = P;
        }
    }

    //return modified dht table
    return T;
}

const refreshBuckets = (T, peerArray) => {

    //call pushBucket multiple times dependng on how many peers are in array
    for (let i = 0; i < peerArray.length; i++) {
        T = pushBucket(T, peerArray[i]);
    }

    //return modified dht table
    return T;
}

const sendHello = async (T) => {

    //Loop over everything in dht table
    for (let i = 0; i < T.length; i++) {

        //Create promise to wait for socket to finish sending data before we close
        await new Promise((resolve) => {
            const socket = new net.Socket();    //Create new socket for every peer in dht 
            socket.connect(T[i].port, T[i].ip, () => {      //Connect using the ip and port                
                socket.write(kadPTPPacket.getPacket(2, 1, singleton.getPeerName(), [singleton.getPeerIp()], [singleton.getPeerPort()]));    //Send hello packet
                socket.end();   //end client side
            });
            socket.on('finish', () => {
                resolve();  //Resolve promise to go to hext element in dht
            });
        });
    }
}

//Determine distqance of two binary numbers
const XORing = (a, b) => {
    let ans = "";
    for (let i = 0; i < a.length; i++) {
        // If the Character matches
        if (a[i] == b[i])
            ans += "0";
        else
            ans += "1";
    }
    return ans;
}

// Returns the integer value of the extracted bits fragment for a given packet
const parseBitPacket = (packet, offset, length) => {
    let number = "";
    for (var i = 0; i < length; i++) {
        // let us get the actual byte position of the offset
        let bytePosition = Math.floor((offset + i) / 8);
        let bitPosition = 7 - ((offset + i) % 8);
        let bit = (packet[bytePosition] >> bitPosition) % 2;
        number = (number << 1) | bit;
    }
    return number;
}

// Converts byte array to string
const bytesToString = (array) => {
    var result = "";
    for (var i = 0; i < array.length; ++i) {
        result += String.fromCharCode(array[i]);
    }
    return result;
}

//Check the number of left most bits that match in 2 binary numbers
const leftMostBits = (binaryStringOne, binaryStringTwo) => {
    let sharedBits = 0;
    for (let i = 0; i < binaryStringOne.length; i++) {
        if (binaryStringOne[i] === binaryStringTwo[i]) {
            sharedBits++;
        }
        else {
            break;
        }
    }
    return sharedBits;
}

//Convert hex to binary
const Hex2Bin = (hex) => {
    var bin = "";
    hex.split("").forEach(str => {
        bin += parseInt(str, 16).toString(2).padStart(4, '0');
    })
    return bin;
}