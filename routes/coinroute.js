const Router = require('express').Router()
var axios = require('axios');
const static_data = require('../logics/static_data');
const analysis = require('../logics/analysis.js')

const base_url = 'https://api.coinstats.app/public/v1/';

Router.get('/exchange', (req, res) => {
    /** 
    this route can accept an optional query called static query of true or false
     if successfully it returns just a list of string ['Luno','Binance'] 
    **/
    let shouldBeStatic = req.query.static
    if(shouldBeStatic === undefined){
      shouldBeStatic = true;
    }
    //shouldBeStatic = shouldBeStatic === undefined ? true : false
    try {
      console.log(JSON.parse(shouldBeStatic))
        if (JSON.parse(shouldBeStatic)) {
            res.status(200).json(static_data.staticExchangePlatform())
            return
        }

        var config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${base_url}exchanges`,
            headers: {}
        };
        axios(config)
            .then(function(response) {
                res.status(200).json(response.data["supportedExchanges"]);
            })
            .catch(function(error) {
                res.json(error.message);
            });
    } catch (e) {

        res.status(500).json("something wrong from our server endpoint ");
    }

    return;
})

/**
  this route enables a user to see coin id , name and symbol
  it accepts no param or query and returns either a 200 or a 500 error.
  200 error is of this format :
  [
    {
      "id": "bitcoin",
      "name": "Bitcoin",
      "symbol": "BTC"
    },
    {
      "id": "ethereum",
      "name": "Ethereum",
      "symbol": "ETH"
    },
  ]
  500 error is just a simple string message such as : server down
**/

Router.get('/coins/symbols',(req, res) => {
  try {
    // statements
    return res.status(200).json(static_data.getStaticCoinData());
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }
  
})

Router.get('/coins',getCoinSummary, (req, res) => {
  try {
    // statements
    return res.status(200).json(req.analyzedData);
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }
  
})

// this get the coin and allow the user download the coin if all params passes. check for query passed in to the getCoinSummary
Router.get('/coins/download', getCoinSummary,(req, res) => {
  const workbook = analysis.generateExcel(req.analyzedData,'market-analysis');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=coin_summary.xlsx');

  workbook.xlsx.write(res).then(() => {
    res.end();
  });
});


/**
  this takes in only coinId as query and returns an object of this 
  format if status is 200
  [
    {
      "price": 0.4703,
      "exchange": "BinanceFutures",
      "pair": "XRP/USDT",
      "pairPrice": 0.4703,
      "volume": 490103396.53863996
    },
  ]
**/
Router.get('/markets', getPlatformTrade, (req, res) => {
  res.status(200).json(req.analyzedData);
})

// this get the coin and allow the user download the market coin pair price if all params passes. check for coinId query passed in to the getCoinSummary. This response returns an excel file that will be downloaded as soon as the response is successfull
Router.get('/markets/download', getPlatformTrade,(req, res) => {
  const workbook = analysis.generateExcel(req.analyzedData,'exchange-pair-trade');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=market_pair_summary.xlsx');
  workbook.xlsx.write(res).then(() => {
    res.end();
  });
});

/** 
  this route takes in a query of :coinId, fromId & toId
  and returns if successfull an Array of this format 
  [
    
    {
    "price": 1856.3,
    "exchange": "KucoinFutures",
    "pair": "ETH/USD",
    "pairPrice": 1856.3,
    "volume": 7850697373.4
    },
  ] 
**/
Router.get('/markets/byPair', getPlatformTrade, (req, res) => {
  try {
    const pair_from = req.query.fromId.toUpperCase();
    const pair_to = req.query.toId.toUpperCase();
    if (pair_to === undefined || pair_from === undefined){
       res.status(406).json('Asset to pair must be specified such as fromId="BTC" toId ="ETH"')
    }
    res.status(200).json(analysis.getDataByPair(req.analyzedData,`${pair_from}/${pair_to}`));
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }  
})

/**
  This takes in a query of coinId and platform which specifies the exchange platform the user is trying to get buying & trading price of a particular coin
  
  for a 200 sample response data 
  sample data retrieved:
  [
    {
    "price": 1853.84,
    "exchange": "ABCC",
    "pair": "ETH/USDT",
    "pairPrice": 1853.84,
    "volume": 60547.19486664
    },
    {
    "price": 1850.6588099999997,
    "exchange": "ABCC",
    "pair": "ETH/USDC",
    "pairPrice": 1.001,
    "volume": 33404.9837313192
    }
  ]

  for a 400 or 500 status code response is of this format
  {'message':"error occurred"}
**/
Router.get('/markets/fromExchange', getPlatformTrade, (req, res) => {
  try {
    const exchange = req.query.platform;
    
    if (exchange === undefined){
      res.status(406).json("exchange platform must be passed in query. you can get the list of all exchanges available on this route /exchanges")
      return
    }

    console.log(req.analyzedData)
    res.status(200).json(analysis.getDataByExchange(req.analyzedData,exchange));
    
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }
  return;
})

// all exchange max/min has been cleared successfully 
/**
  This retrieves the exchange platform that trades a particular asset at the highest price. specify the coinId, fromId, toId
  it returns a single exchange platform with highest trading price
  200 sample 
  {
    "price": 0.4713,
    "exchange": "Bybit",
    "pair": "XRP/USDC",
    "pairPrice": 1,
    "volume": 6669125.662326
  }
**/
Router.get('/exchange/maxPrice', getPlatformTrade, (req, res) => {
  try {
    const from = req.query.fromId.toUpperCase();
    const to = req.query.toId.toUpperCase();
    if (from === undefined || to === undefined){
      res.status(406).json("The coin pair must be specified through fromId, toId e.g fromId='ADA' toId='USDT'")
      return
    }
    res.status(200).json(analysis.exchangePlatformWithMaxPrice(req.analyzedData,`${from}/${to}`));
    
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }
  return;
})

/**
  This retrieves the exchange platform that trades a particular asset at the lowest price in respective to other platform retrieved with this api
  specify the coinId, fromId, toId
  it returns the first single exchange platform with highest trading price
  200 sample response:
    {
      "price": 0.4713,
      "exchange": "Bybit",
      "pair": "XRP/USDC",
      "pairPrice": 1,
      "volume": 6669125.662326
    }
**/
Router.get('/exchange/minPrice', getPlatformTrade, (req, res) => {
  try {
    const from = req.query.fromId.toUpperCase();
    const to = req.query.toId.toUpperCase();
    if (from === undefined || to === undefined){
      res.status(406).json("The coin pair must be specified through fromId, toId e.g fromId='ADA' toId='USDT'")
      return
    }

    res.status(200).json(analysis.exchangePlatformWithMinPrice(req.analyzedData,`${from}/${to}`));
    
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }
  return;
})

/**
  This retrieves the exchange platform that performed the most voluminous trade in respective to other platform retrieved with this api
  specify the coinId, fromId, toId
  it returns the first single exchange platform with highest volume of a particular pair trade
  {
    "price": 0.4713,
    "exchange": "Bybit",
    "pair": "XRP/USDC",
    "pairPrice": 1,
    "volume": 6669125.662326
  }
**/
Router.get('/exchange/maxVolume', getPlatformTrade, (req, res) => {
  try {
    const from = req.query.fromId.toUpperCase();
    const to = req.query.toId.toUpperCase();
    if (from === undefined || to === undefined){
      res.status(406).json("The coin pair must be specified through fromId, toId e.g fromId='ADA' toId='USDT'")
      return
    }

    res.status(200).json(analysis.exchangePlatformWithMaxVolumeTraded(req.analyzedData,`${from}/${to}`));
    
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }
  return;
})

/**
  This retrieves the exchange platform that performed the least voluminous trade in respective to other platform retrieved with this api specify the coinId, fromId, toId
  it returns the first single exchange platform with lowest volume of a particular pair trade
  sample 200 response data
  {
    "price": 0.4713,
    "exchange": "Bybit",
    "pair": "XRP/USDC",
    "pairPrice": 1,
    "volume": 6669125.662326
  }
**/
Router.get('/exchange/minVolume', getPlatformTrade, (req, res) => {
  try {
    const from = req.query.fromId.toUpperCase();
    const to = req.query.toId.toUpperCase();
    if (from === undefined || to === undefined){
      res.status(406).json("The coin pair must be specified through fromId, toId e.g fromId='ADA' toId='USDT'")
      return
    }

    res.status(200).json(analysis.exchangePlatformWithMinVolumeTraded(req.analyzedData,`${from}/${to}`));
    
  } catch(e) {
    // statements
    res.status(500).json(e.message)
  }
  return;
})


// this route takes in period, coinId as query and an optional trend of true/false
/**
  sample data recovered
  when includeTrend == false
  [
    {
    "date": "6/21/2023",
    "time": "3:48:00 PM",
    "price": 1877.7566
    },
    {
    "date": "6/21/2023",
    "time": "4:48:00 PM",
    "price": 1881.3298
    },
  ]
  but when includeTrend == true
  [
    {
    "date": "6/21/2023",
    "time": "3:48:00 PM",
    "price": 1877.7566,
    "priceChange": 0,
    "changeDirection": "Unchanged"
    },
    {
    "date": "6/21/2023",
    "time": "4:48:00 PM",
    "price": 1881.3298,
    "priceChange": 3.5732000000000426,
    "changeDirection": "Increase"
    },
  ]
**/
Router.get('/historicalprice', getHistoricalPrice, (req, res) => {
  let trend = req.query.includeTrend === undefined || req.query.includeTrend === false  ? false:true;
   try {
      if(!trend){
        let data = req.analyzedData
        res.status(200).json(analysis.historicalCoinDateTimePrice(data));
      }else{
        let data = req.analyzedData
        let treated_data = analysis.historicalCoinDateTimePrice(data);
        res.status(200).json(analysis.analysePriceTrend(treated_data))
      } 
   } catch(e) {
     // statements
     console.log(e);
   }
   return;
})


Router.get('/historicalprice/download', getHistoricalPrice, (req, res) => {
    let trend = req.query.includeTrend === undefined ? false : req.query.includeTrend;
    let workbook;
    try {
        if (!trend) {
            let data = req.analyzedData
            workbook = analysis.generateExcel(analysis.historicalCoinDateTimePrice(data));
        } else {
            let data = req.analyzedData
            let treated_data = analysis.historicalCoinDateTimePrice(data);
            workbook = analysis.generateExcel(analysis.analysePriceTrend(treated_data))
        }
        setExcelResponseHeader(res)
        workbook.xlsx.write(res).then(() => {
            res.end();
        })
    } catch (e) {
        // statements
        console.log(e.message);
        res.end()
    }
    return;
})

//MIDDLEWARE SECTIONS
// middle ware to get coin market
function getCoinSummary(req,res,next){
  const skip = req.query.skip === undefined ? 0 :req.query.skip
  const limit = req.query.limit === undefined ? 20 :req.query.limit

    var config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${base_url}coins?skip=${skip}&limit=${limit}`,
        headers: {}
    };
    
    try {
      if(!isNaN(skip) && !isNaN(limit)){
        axios(config)
        .then(function(response) {
              req.analyzedData = analysis.marketDataExtraction(response.data);
              next();
          })
          .catch(function(error) {
              checkUserNetworkConnectivity(error,res);
          });  
      
      }else{
        res.status(406).json({message:"Bad Query Format passed in. Your query to be sent must be a number"})
        return
      }

    } catch(e) {
      // statements
      res.status(500).json({message:e.message})
      return;
    }  
}

function getPlatformTrade(req,res,next){
  try {
    const coin_id = req.query.coinId
    var config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${base_url}markets?coinId=${coin_id}`,
        headers: {}
    };

    axios(config)
        .then(function(response) {
            req.analyzedData = response.data
            next();
        })
        .catch(function(error) {
            checkUserNetworkConnectivity(error, res);
        });
  } catch(e) {
    // statements
     res.status(500).json({message : 'internal server problem'});
  }
  return
}

function getHistoricalPrice(req, res, next) {
    // available periods 
    //available periods - 24h | 1w | 1m | 3m | 6m | 1y |all
    let period = req.query.period
    let coinId = req.query.coinId

    // also do test for checking if the coin id is valid 
    if (coinId === undefined) {
        return res.status(406).json("coinId to retrieved must be specified alongside query");
        return;
    } else {
        coinId = coinId.toLowerCase().replace(" ", '')
    }
    period = period === undefined ? "24h" : period.replace(" ", "")

    var config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${base_url}charts?period=${period}&coinId=${coinId}`,
        headers: {}
    };

    axios(config)
        .then(function(response) {
            req.analyzedData = response.data;
            next();
        })
        .catch(function(error) {
            checkUserNetworkConnectivity(error,res);
            return
        });
        return;
}

function setExcelResponseHeader(res){
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=historical_price_summary.xlsx');
}

// this function is not used as a middleware but it helps server verify if the error is from the user or from our server end point 
function checkUserNetworkConnectivity(error, res){ 
  if(error.message === "getaddrinfo ENOTFOUND api.coinstats.app"){
      res.status(408).json({message:'Check your Internet Connectivity'});
      return
  }else{
    res.status(500).json({message : error.message});
    return;
  }
}


module.exports = Router