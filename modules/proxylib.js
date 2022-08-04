

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
    this.AliveTimer = new Timer(cfg.ttl * 1000);
    //Number of connections
    this.connections = 0
    //Amount of times registered
    this.reg_amount = 0
    //this.isVacant = true
}

