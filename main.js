
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

var api_delay = 1000
var proxies_list = proxy_list.split(/\r?\n/)

var proxies_ctr = 0
var active_proxies = 0

var clients_ctr = 0
//hashmap abuser
var proxies = {}
var clients = {}
var proxies_req_data = undefined

var names = []

var used_names = []

var proxy_check_targtime = 0

dateObj = new Date();


function GetTime()
{
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
        if(GetTime() < this.targtime)
        {
            
            return true;
        }
        else{
            return false;
        }
    }
    this.Reset = function()
    {
        this.targtime = GetTime() + this.interval
    }
}


ProxyCheckTimer = new Timer(config.proxy_api.check_delay)
ProxyAPITimer = new Timer(1024)

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
    this.termination_est = cfg.ttl * 1000 + GetTime()
    //Number of connections
    this.connections = 0
    //Amount of times registered
    this.reg_amount = 0
    this.isEmpty = false
}
//Wrapper for client

function MCClient(name, pw, proxy)
{
    this.disconnected = false;
    this.destroyClient = false;
    this.targetReconTime = 0;
    this.name = name;

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
                    console.log(err)
                }

                client.setSocket(info.socket)
                client.emit('connect')
            })
       }
    })
    this.sendChat(msg)
    {
        this.client.write("chat", 
        {
            "message" : msg
        })
    }
    this.reconnect()
    {
        if(!this.disconnected)
        {
            this.client.connect(config.port, config.host);
        }
        
    }
    this.Run = function()
    {
        this.client.on('packet', function (packet) {
            if (config.log_packets) {
                console.log(packet)
                if (packet.data) {
                    console.log(packet.data.toString())
                }
            }
        })
        this.client.on('connect', function () {
            console.info('connected')
            this.sendChat(config.mode.mass_register.reg_msg);
            this.sendChat(config.mode.pay.pay_msg);
            this.proxy.connections++;
            this.proxy.reg_amount++;
            this.destroyClient = true;

        })
        this.client.on('disconnect', function (packet) {
            console.log('disconnected: ' + packet.reason)
        })
        this.client.on('end', function () {
            console.log('Connection lost')
            this.disconnected = true
            if(!this.destroyClient)
            {
                this.targetReconTime = GetTime() + config.reconnect.delay
            }
            
            
        })
        this.client.on('message', function (packet) {
            console.log(packet.toString())
        })
        while(!this.destroyClient)
        {
            if(this.disconnected)
            {
                if(GetTime() >= this.targetReconTime)
                {
                    this.reconnect()
                }
            }
        }
        if(this.destroyClient)
        {
            
            this.client.end("aaa");
            this.proxy.connections--;
        }
    }

    
    
    
}
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
    console.log("Requesting more proxies...")
    let data = {}
    axios
    .get(config.proxy_api.url,
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
    .then(function (response) {
        console.log("resp: ")
        console.log(response);
        proxies_req_data = response.data.data
      })
      .catch(function (error) {
        console.log(error);
      })
      .then(function () {
        
      });  
      
    
}

function GetProxiesSynced(num,time_avail,ip_dedup)
{

    GetProxies(num, time_avail, ip_dedup)
    while(proxies_req_data == undefined)
    {
        
    }

    for(let i in proxies_req_data)
    {

        proxies[proxies_req_data[i]["host"]] = new Proxy({
            host : proxies_req_data[i]["host"], 
            port : proxies_req_data[i]["port"],
            ttl : proxies_req_data[i]["ttl"]
        })
        
    }
    proxies_req_data = undefined
}
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
function GetValidProxy()
{
    Object.keys(proxies).forEach(function(k)
    {
        if(proxies[k].reg_amount < config.max_on_ip)
        {
            if(proxies[k].connections < config.max_accs_per_proxy)
            {
                return proxies[k]
            }
        }
        
        
    })
    //If no proxies are available
    return null
}

function UpdateProxies()
{

    if(ProxyCheckTimer.Check())
    {
        ProxyCheckTimer.Reset()
        Object.keys(proxies).forEach(function(k)
        {
            //If surpassed alive time
            if(proxies[k].termination_est <= GetTime())
            {
                delete proxies[k];
            }

            //If used more than twice
            if(config.mode.mass_register.enabled)
            {
                if(config.mode.mass_register.max_on_ip >= proxies[k].reg_amount)
                {
                    delete proxies[k]
                }
            }
            
            //Edge case prob dont have to fix but
            //if proxy is invalid
            else if(proxy_check_targtime <= GetTime())
            {
                if(!CheckProxy(proxies[k].ip, proxies[k].port))
                {
                    
                    delete proxies[k];

                }
            }
            

        })
    }
    

    
    //If not enough proxies
    let active_proxies = Object.keys(proxies).length;
    if(active_proxies < config.proxy_api.min)
    {
        if(ProxyAPITimer.Check())
        {
            ProxyAPITimer.Reset()
            console.log("Current number of proxies is " + active_proxies + " which is less than the minimum amount of " + config.proxy_api.min.toString())
            p = GetProxies(100,1,1);

        }
        
    }
}


function UpdateClients()
{
    Object.keys(clients).forEach(function(k)
    {
        if(clients.destroyClient)
        {
            delete clients[k]
        }
    })
    let active_clients = Object.keys(clients).length;
    if(active_clients < config.num_accounts.min)
    {
        let clients_to_gen = config.num_accounts.min - active_clients
        console.log("Current number of clients is " + active_clients + " which is less than the minimum amount of " + config.num_accounts.min.toString())
        
        if(GetValidProxy() != null)
        {
            console.log("Generating " + clients_to_gen.toString() + " clients...")
            for(let i = 0; i < clients_to_gen; i++)
            {
                let newName = GenName()
                clients[newName] = new MCClient(newName, undefined, GetValidProxy())
            }
        }
        else
        {
            console.log("Insufficient amount of proxies.")
        }
        
        
    }
    
}

ProxyUpdateTimer = new Timer(1000)
ClientUpdateTimer = new Timer(1000)

function main()
{
    console.log("Starting main function")
    while(1)
    {
        if(ProxyUpdateTimer.Check())
        {
            ProxyUpdateTimer.Reset()
            UpdateProxies()
        }
        if(ClientUpdateTimer.Check())
        {
            ClientUpdateTimer.Reset()
            UpdateClients()
        }
        
    }
}
var p = {}
p = GetProxiesSynced(1,1,0)
console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
console.log(p)
//main()
//