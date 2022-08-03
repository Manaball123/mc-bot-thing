const snekfetch = require("snekfetch")
const mineflayer = require("mineflayer")
const mc = require("minecraft-protocol");
const socks = require('socks').SocksClient
const ProxyAgent = require('proxy-agent')

const config = require("./config.json")
const fs = require("fs");
const request = require('request');
const Agent = require('socks5-http-client/lib/Agent');


const proxy_list = fs.readFileSync(`./proxies.txt`, 'utf-8')

const namesdb = fs.readFileSync(config.namesdb, "utf-8")


var proxies_list = proxy_list.split(/\r?\n/)

var proxies_ctr = 0
var active_proxies = 0

var clients_ctr = 0
//hashmap abuser
var proxies = {}
var clients = {}

var names = []

var used_names = []

dateObj = new Date();
function GetTime()
{
    return dateObj.getTime();
}

function GenName()
{

}

//Proxy class

function Proxy(host, port, user, pass)
{
    this.host = host
    this.port = port
    if(user != null)
    {
        this.user = user
        this.pass = pass
    }

    //Amount of times registered
    this.reg_amount = 0
    this.isEmpty = false
}
//Wrapper for client

function MCClient(user, pw, proxy)
{
    this.disconnected = false;
    this.destroyClient = false;
    this.targetReconTime = 0;

    this.client = mc.createClient({
        host: config.ip,           // optional
        port: config.port,         // optional
        username: user,
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

        }
    }

    
    
    
}
//should make it count based but am too lazy
function GetProxies(n)
{
    res = request(config.proxy_api.url)
    res.content.data
}
function CheckProxy(ip, port) {

    request("http://" + ip + port.toString() , function (err, res) {
            if (err) 

            {
                return false;
            } 
            else if (res.statusCode != 200) 
            {
                return false;
                
            } 
            else 
            {
                return true
            }

        });
}

function UpdateProxies()
{
    Object.keys(proxies).forEach(function(k)
    {
        //If used more than twice
        if(config.mode.mass_register.enabled)
        {
            if(config.mode.mass_register.max_on_ip >= proxies[k].reg_amount)
            {
                delete proxies[k]
            }
        }
        //If proxy is invalid
        else if(!CheckProxy(proxies[k].ip, proxies[k].port))
        {
            
            delete proxies[k];

        }

    })
    
    //If not enough proxies
    let active_proxies = Object.keys(proxies).length();
    while(active_proxies < config.proxy_api.min)
    {
        
    }
}



if (config.altening) {
    alts = []
    setInterval(() => {
        snekfetch.get(`http://api.thealtening.com/v1/generate?token=${config.altening_token}&info=true`).then(n => {
            if (!alts.includes(n.body.token)) {
                run(n.body.token, "a")
                alts.push(n.body.token)
            }
        });
    }, config.loginintervalms)
} else {
    fs.readFile("accounts.txt", 'utf8', function (err, data) {
        if (err) throw err;
        const lines = data.split(/\r?\n/);
        setInterval(() => {
            if (lines[0]) {
                const line = lines.pop()
                run(line.split(":")[0], line.split(":")[1])
            }
        }, config.loginintervalms)
    });
}
function UpdateClients(clients)
{

}



function main()
{
    
}

//i dont like this funtion....
function run(userid, password) {
    let combo = [email, password]
    if(!proxies[0])
    {
        return console.log("Not logging in, out of proxies.");
    }
    let proxy = proxies.pop();
    let proxycombo = proxy.split(":");
    console.log(proxycombo)
    console.log("STARTING")


    client.on('error', function (error){
        if(!error.toString().includes("Invalid credentials")){
            if(int){
                run(combo[0], combo[1], int)
            } else {
                run(combo[0], combo[1], 1)
            }
        } else {
            if(int){
                if(int < config.maxattemptsperproxy){
                    run(combo[0], combo[1], int+1)
                } else {
                    return console.log("max attempts reached")
                }
            } else {
                run(combo[0], combo[1], int+1)
            }
        }
        console.log(error.toString())
    })
}