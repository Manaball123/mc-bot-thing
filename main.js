
const mc = require("minecraft-protocol");
const socks = require('socks').SocksClient
const ProxyAgent = require('proxy-agent')

const config = require("./config.json")
const fs = require("fs");
const https = require('https');
const axios = require('axios').default;
const url = require('node:url');
const { rawListeners } = require("process");


const proxy_list = fs.readFileSync(`./proxies.txt`, 'utf-8')

const namesdb = fs.readFileSync(config.generate_offlines.gen_fn, "utf-8")

var api_delay = 10000
var proxies_list = proxy_list.split(/\r?\n/)


var clients_ctr = 0
//hashmap abuser
var proxies = {}
var clients = {}
var proxies_req_data = undefined

var names = []

var used_names = []

var proxy_check_targtime = 0


function print(a)
{
    console.log(a)
}

function GetTime()
{ 
    var dateObj = new Date();
    return dateObj.getTime();
}

function RandInt(min, max)
{
    return Math.floor(Math.random() * max) - min;
}

function GenName()
{
    name_base = namesdb[RandInt(0, namesdb.length - 1)];
    return name_base + RandInt(0, 999999).toString()
}

//Timer class
function Timer(interval)
{
    this.interval = interval
    this.targtime = GetTime() + this.interval
    
    this.Check = function()
    {
        if(GetTime() >= this.targtime)
        {
            
            return true;
        }
        else
        {
            return false;
        }
    }
    this.Reset = function()
    {
        this.targtime = GetTime() + this.interval
    }
}


ProxyCheckTimer = new Timer(config.proxy_api.check_delay)
ProxyAPITimer = new Timer(api_delay)

//Proxy class

function Proxy(cfg)
{   

    this.host = cfg.host
    this.port = cfg.port
    if(cfg.user != undefined)
    {
        this.user = cfg.user
        this.pass = cfg.pass
    }
    this.AliveTimer = new Timer(cfg.ttl * 1000)
    //Number of connections
    this.connections = 0
    //Amount of times registered
    this.reg_amount = 0
    //this.isVacant = true
}
//Wrapper for client

function MCClient(name, pw, proxy)
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

    //Initialize the MC client
    print("Creating new client with name " + this.name)
    this.client = mc.createClient({
        host: config.ip,           // optional
        port: config.port,         // optional
        username: name,
        password: pw,
        auth: config.auth, // optional; by default uses offline mode, if using a microsoft account, set to 'microsoft'
        version: config.version,
        agent: new ProxyAgent({protocol: config.socks_version2 + ":", host: proxy.host, port: proxy.port}),
        connect: client => {
        
            socks.createConnection({
                proxy: {
                    host: proxy.host,
                    port: proxy.port,
                    type: config.socks_version
                },
                command: 'connect',
                destination: {
                    host: config.ip,
                    port: config.port
                }
            }, (err, info) => {
                if (err) {
                    print(err)
                }

                client.setSocket(info.socket)
                client.emit('connect')
            })
       }
    })
    print(this.name + " Created.")
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

//Not useful unless using the shit version of the https thing
function GetQueryString(base, params)
{
    var s = base
    s += "?"
    Object.keys(params).forEach(function(k)
    {
        s += k
        s += "="
        s += params[k].toString()
        s += "&"

    })
    return s.substring(0, s.length - 1);

}
//should make it count based but am too lazy
async function GetProxies(num, time_avail, ip_dedup)
{
    print("Requesting more proxies...")

    let res = await axios.get(config.proxy_api.url,
        {
            params : 
            {
                'token': config.proxy_api.token,
                'num': num,
                'protocol': "SOCKS5",
                'time_avail': time_avail,
                'result_format': 'JSON',
                'ip_dedup': (ip_dedup ? 1 : 0)
            }
            
    })


    print("API server responded with ")
    print(res)
    print(res.data)
    print("Typeof res: ")
    print(typeof res)
    
    var p = res.data.data
    for(let i = 0; i < p.length; i++)
    {
        //print(p[i])
        //print(proxies)
        
        proxies[p[i]["ip"]] = new Proxy({
            host : p[i]["ip"],  
            port : p[i]["port"],
            ttl : p[i]["ttl"]
        })
        
            
    }
    print("Proxies after request: ")
    print(proxies)
    
    
}



//not useful because proxies can be checked with ttl
function CheckProxy(ip, port) {

   axios
  .get()
  const options = {
    hostname: "http://" + ip,
    port: port,
    method: 'GET',
  };
  
  const req = https.request(options, function(res){
    if(res.statusCode == 200)
    {
        return true
    }
    return false
  })
  

}
//Returns a valid proxy 
//Returns nothing if none is found
function GetValidProxy()
{
    //(proxies)
    keys = Object.keys(proxies)
    //Iterate through all proxies
    for(let i = 0; i < keys.length; i++)
    {
        let k = keys[i]


        //If surpassed alive time
        if(proxies[k].AliveTimer.Check())
        {
        
            delete proxies[k];
        }
        else
        {
            //If proxy isn't used for registeration on enough accounts
            if(proxies[k].reg_amount < config.mode.mass_register.max_on_ip)
            {
                //If proxy can still have more connections
                if(proxies[k].connections < config.max_accs_per_proxy)
                {
                    
                    return proxies[k]
                }
            }
            else
            {
                delete proxies[k]
            }
        }
        
    }

    //If no proxies are available
    return null
}

async function UpdateProxies()
{

    if(ProxyCheckTimer.Check())
    {
        ProxyCheckTimer.Reset()
        Object.keys(proxies).forEach(function(k)
        {
            //If surpassed alive time
            if(proxies[k].AliveTimer.Check())
            {

                delete proxies[k];
            }

            //If used more than max register limit
            else if(config.mode.mass_register.enabled)
            {

                if(config.mode.mass_register.max_on_ip <= proxies[k].reg_amount)
                {
                    //print(k + "deleted")
                    delete proxies[k]
                }
            }
            
            //Edge case prob dont have to fix but
            //if proxy is invalid
            /*
            else if(proxy_check_targtime <= GetTime())
            {
                if(!CheckProxy(proxies[k].ip, proxies[k].port))
                {
                    
                    delete proxies[k];

                }
            }
            */

        })
    }
    

    
    //If not enough proxies
    let active_proxies = Object.keys(proxies).length;
    if(active_proxies < config.proxy_api.min)
    {
        print("Current number of proxies is " + active_proxies + " which is less than the minimum amount of " + config.proxy_api.min.toString())

        //If no api cooldown
        if(ProxyAPITimer.Check())
        {
            ProxyAPITimer.Reset()
            print("Calling GetProxies")
            await GetProxies(100,1,1);
            print("Finished requesting new proxies.")

        }
        else
        {
            print("Request on cooldown. The last request could still be unfinished.")
        }
        
    }
}


async function UpdateClients()
{
    //Loops through each client
    Object.keys(clients).forEach(function(k)
    {
        //Reconnect clients if they are offline
        clients[k].MaintainClient()

        //Delete client if marked for deletion
        if(clients[k].destroyClient)
        {
            //Disconnect client first
            clients[k].Disconnect()
            //Delete client
            delete clients[k]
        }
    })
    let active_clients = Object.keys(clients).length;
    if(active_clients < config.num_accounts.min)
    {
        let clients_to_gen = config.num_accounts.min - active_clients
        print("Current number of clients is " + active_clients + " which is less than the minimum amount of " + config.num_accounts.min.toString())
        //If there are still usable proxies
        if(GetValidProxy() != null)
        {
            print("Generating " + clients_to_gen.toString() + " clients...")
            for(let i = 0; i < clients_to_gen; i++)
            {
                //Generate new offline name for client(cracked server only)
                let newName = GenName()
                //Create a new client instance
                clients[newName] = new MCClient(newName, undefined, GetValidProxy())
                //Call the above client's init function thing
                clients[newName].Run()
            }
        }
        else
        {
            print("Failed to generate clients. Insufficient amount of proxies.")
        }
        
        
    }
    
}

ProxyUpdateTimer = new Timer(5000)
ClientUpdateTimer = new Timer(5000)

async function main()
{
    print("Starting main function")
    await GetProxies(10,1,0)
    while(1)
    {
        if(ProxyUpdateTimer.Check())
        {
            ProxyUpdateTimer.Reset()
            await UpdateProxies();
        }
        if(ClientUpdateTimer.Check())
        {
            ClientUpdateTimer.Reset()
            await UpdateClients();
        }

        
    }
}
//GetProxies(10,1,0)


main()


