



const config = require("./config.json")
const fs = require("fs");
const https = require('https');
const axios = require('axios').default;
const url = require('node:url');
const { rawListeners } = require("process");

const utils = require("./modules/utils")


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







function GenName()
{
    name_base = namesdb[RandInt(0, namesdb.length - 1)];
    return name_base + RandInt(0, 999999).toString()
}





ProxyCheckTimer = new Timer(config.proxy_api.check_delay)
ProxyAPITimer = new Timer(api_delay)



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


