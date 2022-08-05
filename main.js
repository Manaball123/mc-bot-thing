
const config = require("./config.json")
const fs = require("fs");
const https = require('https');
const axios = require('axios').default;
const url = require('node:url');
const { Timer } = require("./modules/utils");
const { ProxiesList } = require("./modules/proxylib");
const { MCClientsList } = require("./modules/client");

const utils = require("./modules/utils")
const pl = require("./modules/proxylib")
const cl = require("./modules/client")

//const proxy_list = fs.readFileSync(`./proxies.txt`, 'utf-8')
function print(a)
{
    console.log(a)
}
//var Timer = utils.Timer()

const api_delay = 1000
//var proxies_list = proxy_list.split(/\r?\n/)



var proxiesList = new ProxiesList()
var clientsList = new MCClientsList(proxiesList)



/*
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
*/

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

async function AddProxies()
{
    let curr_n = proxiesList.GetNum()
    if(curr_n >= config.proxy_api.target_num)
    {
        return;
    }
    let get_count = config.proxy_api.target_num - curr_n

    get_count = get_count > 10 ? 10 : get_count
    print("Fetching proxies from API... --- PROXY")
    await proxiesList.GetFromAPI(config.proxy_api.url, config.proxy_api.token, get_count, 1)
}


Timers = 
{
    Proxy : 
    {
        Filter : new Timer(5000),
        API : new Timer(api_delay),
    },
    Client :
    {
        WriteNames : new Timer(60000),
        Update : new Timer(1000),
        Create : new Timer(config.connection_delay)
    }
}



async function main()
{
    print("Starting main function")
    //AddProxies();
    while(1)
    {
        if(Timers.Proxy.Filter.CheckRS())
        {
            print("Updating proxies... --- PROXY");
            await proxiesList.FilterAllProxies();
        }
        if(Timers.Proxy.API.CheckRS())
        {
            print("Calling AddProxies... --- PROXY");
            await AddProxies();
        }

        if(Timers.Client.WriteNames.CheckRS())
        {
            print("Writing names hist... --- CLIENT")
            await clientsList.WriteNameHist()
        }  
        if(Timers.Client.Update.CheckRS())
        {
            print("Updating clients... --- CLIENT")
            await clientsList.UpdateClients()
        }

        if(Timers.Client.Create.CheckRS())
        {
            print("Calling CreateClients... --- CLIENT")
            await clientsList.CreateClients()
        }

        
    }
}


main()


