


export function print(a)
{
    console.log(a)
}


export function RandInt(min, max)
{
    return Math.floor(Math.random() * max) - min;
}


export function GetTime()
{ 
    var dateObj = new Date();
    return dateObj.getTime();
}


 //Timer class
export function Timer(interval)
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