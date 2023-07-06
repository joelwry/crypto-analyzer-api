const DataFrame = require('dataframe-js').DataFrame
const ExcelJS = require('exceljs');

function extractPriceChange(data){
    let {priceChange1h,priceChange1d,priceChange1w,price } = data;
    priceChange1h = price * (priceChange1h / 100);
    priceChange1d = price * (priceChange1d / 100);
    priceChange1w = price * (priceChange1w / 100);

    return {
        rank: data['rank'],
        id : data.id,
        'coin': data.name,
        'presentPrice':price,
        oneHourPrice : priceChange1h >= 0 ? price - priceChange1h : price + priceChange1h,
        oneDayPrice : priceChange1d >= 0 ? price - priceChange1d : price + priceChange1d,
        oneWeekPrice : priceChange1w >= 0 ? price - priceChange1w : price + priceChange1w,
        priceChange1h,priceChange1d,priceChange1w,
        'volumeTraded':data.volume,
        'contractAddress': data.contractAddress === undefined ? "None" : data.contractAddress,
        'url': data.websiteUrl === undefined ? "None" :data.websiteUrl
    }
}

function marketDataExtraction(market){
    return market.coins.map(extractPriceChange)
}

const generateExcel = (market_data,worksheet_name) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheet_name);

  // Set column headers
  const headers = Object.keys(market_data[0]);
  worksheet.getRow(1).values = headers;

  // Fill data rows
  market_data.forEach((data, index) => {
    const rowIndex = index + 2;
    const row = worksheet.getRow(rowIndex);
    headers.forEach((header, colIndex) => {
      row.getCell(colIndex + 1).value = data[header];
    });
  });

  // Formatting
  worksheet.getRow(1).font = { 
        bold: true, family: 4, 
        size: 12, name: 'Bahnschrift SemiBold'
    };

  // worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  worksheet.columns.forEach((column) => {
    column.width = 16;
    column.alignment = { vertical: 'middle', 
        horizontal: 'center',
        wrapText:true 
    };
  });
  worksheet.autoFilter = 'A1:C1';
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  return workbook;
};


// Retrieve all object data from a particular exchange
function getDataByExchange(exchange_data, exchange) {
    // Convert array to a DataFrame
    exchange = exchange.toUpperCase();
    const df = new DataFrame(exchange_data);
    return df.filter((row) => row.get('exchange').toUpperCase() === exchange).toCollection();
}

// Retrieve all object data that have a particular pair
function getDataByPair(exchange_data, pair) {
    const df = new DataFrame(exchange_data);
    return df.filter((row) => row.get('pair') === pair).toCollection();
}

// Retrieve the object that has the maximum price based on a particular pair
function exchangePlatformWithMaxPrice(exchange_data, pair) {
    const filteredData = new DataFrame(getDataByPair(exchange_data,pair));
    const maxPrice = filteredData.stat.max('price');
    return filteredData.filter((row) => row.get('price') === maxPrice).toCollection()[0];
}

// Retrieve the object that has the minimum price based on a particular pair
function exchangePlatformWithMinPrice(exchange_data, pair) {
    const filteredData = new DataFrame(getDataByPair(exchange_data,pair));
    const maxPrice = filteredData.stat.min('price');
    return filteredData.filter((row) => row.get('price') === maxPrice).toCollection()[0];
}

// Retrieve the object that has the maximum volume trade based on a particular pair
function exchangePlatformWithMaxVolumeTraded(exchange_data, pair) {
    const filteredData =new DataFrame(getDataByPair(exchange_data,pair));
    const maxPrice = filteredData.stat.max('volume');
    return filteredData.filter((row) => row.get('volume') === maxPrice).toCollection()[0];
}

// Retrieve the object that has the minimum price based on a particular pair
function exchangePlatformWithMinVolumeTraded(exchange_data, pair) {
    const filteredData = new DataFrame(getDataByPair(exchange_data,pair));
    const maxPrice = filteredData.stat.min('volume');
    return filteredData.filter((row) => row.get('volume') === maxPrice).toCollection()[0];
}

function historicalCoinDateTimePrice(coin_data) {
    const convertedData = coin_data['chart'].map(([timestamp, price, volume, marketCap]) => {
        const date = new Date(timestamp * 1000);
        const readableTime = date.toLocaleString(); // Convert timestamp to readable time string
        return {
            date: readableTime.split(',')[0].trim(),
            time: readableTime.split(',')[1].trim(),
            price: price
        };
    });

    return new DataFrame(convertedData).toCollection();
}

function analysePriceTrend(treated_data) {

    df = new DataFrame(treated_data);

    const previousPrice = df.select('price').toDict().price;
    //console.log(previousPrice);
    const priceChange = df.withColumn('priceChange', (row, index) =>{
        let change =index === 0 ? 0 : row.get('price') - previousPrice[index-1];
        return change
      })
    const changeDirection = priceChange.withColumn('changeDirection', (row) => {
        const change = row.get('priceChange');
        if(change === 0){
          return 'Unchanged'
        }else if(change < 0){
          return "Decrease"
        }else{
          return "Increase"
        }
    });

    return changeDirection.toCollection();
}


module.exports = {
	marketDataExtraction,
	generateExcel,
	getDataByExchange,
	getDataByPair,
	exchangePlatformWithMaxPrice,
	exchangePlatformWithMinPrice,
	exchangePlatformWithMaxVolumeTraded,
	exchangePlatformWithMinVolumeTraded,
	historicalCoinDateTimePrice,
	analysePriceTrend
}
