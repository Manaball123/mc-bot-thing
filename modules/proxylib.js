
const axios = require('axios').default;
const config = require("../config.json")

//Note that none of these are concise abstractions
//Just making this so I have cleaner code

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
    this.NotAlive = new Timer(cfg.ttl * 1000);
    //Number of connections
    this.connections = 0
    //Amount of times registered
    this.reg_amount = 0
}

//Proxy list class
export function ProxiesList()
{
    this.proxies = {}

    this.GetFromAPI = async function(url, token, amount, ip_dedup)
    {
        let res = await axios.get(url,
            {
                params : 
                {
                    'token': token,
                    'num': amount,
                    'protocol': "SOCKS5",
                    'time_avail': 1,
                    'result_format': 'JSON',
                    'ip_dedup': (ip_dedup ? 1 : 0)
                }
                
        })
        
        print("API server responded with ")
        print(res)
        print(res.data)
        print("Typeof res: ")
        print(typeof res)
        let p = res.data.data;
        for(let i = 0; i < p.length; i++)
        {

            let ip = p[i]["ip"]
            let port = p[i]["port"]
            let ttl = p[i]["ttl"]
            
            this.proxies[ip] = new Proxy({
                host : ip,  
                port : port,
                ttl : ttl
            })
            
                
        }
    }
    this.FilterProxy = function(k)
    {
        if(this.proxies[k].NotAlive.Check())
        {
            delete this.proxies[k];
            return false;
        }
        //If proxy is used for registeration on enough accounts
        if(this.proxies[k].reg_amount >= config.mass_register.max_per_ip)
        {
            delete this.proxies[k];
            return false;
        }
        //If too many accounts are on this proxy
        if(this.proxies[k].connections >= config.max_accs_per_proxy)
        {
            return false;
        }
        //Proxy is valid if none of the above matches
        return true;
    }
    //Returns a valid proxy 
    //Returns nothing if none is found
    //Auto deletes unusable proxies
    this.GetValidProxy = function(cfg)
    {
        keys = Object.keys(this.proxies)
        //Iterate through all proxies
        for(let i = 0; i < keys.length; i++)
        {
            let k = keys[i]

            if(this.FilterProxy(k))
            {
                return this.proxies[k]
            }
            
        }

        //If no proxies are available
        return undefined;
    }

    this.FilterAllProxies = function()
    {
        Object.keys(proxies).forEach(this.FilterProxy(k));
    }


}

