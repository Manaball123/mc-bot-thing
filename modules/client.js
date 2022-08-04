import { Timer } from "./utils";


const mc = require("minecraft-protocol");
const socks = require('socks').SocksClient
const ProxyAgent = require('proxy-agent')
require("./utils")
require("./proxylib")


//Client wrapper
export function MCClient(name, pw, proxy)
{
    //If the client is disconnected from the server
    this.disconnected = true;
    
    //If marked for deletion(client is no longer useful, i.e. after starter resources has been used up)
    this.destroyClient = false;
    
    //IGN of client
    this.name = name;

    //Timer for chat cooldown
    this.ChatTimer = new Timer(config.chat_cooldown);

    //Timer for reconnect throttling delay
    this.ReconnectTimer = new Timer(config.reconnect.delay)

    //Queue for chat messages to be sent
    this.msgQueue = []

    this.proxy = proxy

    //Initialize the MC client
    print("Creating new client with name " + this.name)
   
   
    this.client = mc.createClient({
    connect: client => {
      socks.createConnection({
        proxy: {
          host: this.proxy.host,
          port: this.proxy.port,
          type: 5
        },
        command: 'connect',
        destination: {
          host: config.ip,
          port: config.port
        }
      }, (err, info) => {
        if (err) {
          console.log(err)
          return
        }
  
        client.setSocket(info.socket)
        client.emit('connect')
      })
    },
    agent: new ProxyAgent({ protocol: 'socks5:', host: this.proxy.host, port: this.proxy.port }),
    username: this.name,
    //password: process.argv[7]
  })
    
    //print(this.name + " Created.")

    this.SendMessage = function()
    {
        if(this.msgQueue.length > 0)
        {
            var msg = this.msgQueue.shift();
            this.client.write("chat", 
            {
                "message" : msg
            })
            
        }
        
    }

    this.QueueMessage = function(msg)
    {
        this.msgQueue.push(msg)
    }
    this.Connect = function()
    {
        this.client.connect(config.port, config.host);
        
    }
    this.Disconnect = function()
    {
        this.client.end("lol")
    }
    this.AutoReconnect = function()
    {
        //If not disconnected then break
        if(!this.disconnected)
        {
            return;
        }
        
        //If exceeded delay
        if(this.ReconnectTimer.Check())
        {
            this.ReconnectTimer.Reset()
            this.Connect();
        }


    }
    //Client looping stuff idk
    this.MaintainClient = function()
    {

        this.AutoReconnect()
        
    }

    //Run when client instance is created
    this.Run = function()
    {
        print("Initializing client " + name)
        this.QueueMessage(config.mode.mass_register.reg_msg);
        this.QueueMessage(config.mode.pay.pay_msg);
        this.ChatTimer.Reset()
        //I hope this is called very frequently
        //If not im fucked lol
        this.client.on('packet', function (packet) {
            if (config.log_packets) {
                print(packet)
                if (packet.data) {
                    print(packet.data.toString())
                }
            }
        //Message spammer
            if(this.ChatTimer.Check())
            {
                this.ChatTimer.Reset()
                this.SendMessage()
            }

        //Disconnect if no chat tasks left
            if(this.msgQueue.length == 0)
            {
                this.destroyClient = true
            }
        })
        //On client connect
        this.client.on('connect', function () {
            print("Client with name " + this.name + " connected.")
            
            this.disconnected = false
            //Update proxy counters
            this.proxy.connections++;
            this.proxy.reg_amount++;
            

        })
        this.client.on('disconnect', function (packet) {
            print(this.name +' disconnected: ' + packet.reason)
        })
        this.client.on('end', function () {
            print(this.name + ' Lost connection')
            this.disconnected = true
            this.proxy.connections--;
            
            
        })
        this.client.on('message', function (packet) {
            print(this.name + " Recieved message: " + packet.toString())
        })
        
    }

    
    
    
}




