/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var starTransects = ee.FeatureCollection("users/fabrice/fractional_components"),
    landsat5 = ee.ImageCollection("LANDSAT/LT05/C01/T1_SR"),
    landsat7 = ee.ImageCollection("LANDSAT/LE07/C01/T1_SR"),
    landsat8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR"),
    MOD09A1Collection = ee.ImageCollection("MODIS/006/MOD09A1"),
    MCD43A4Collection = ee.ImageCollection("MODIS/006/MCD43A4"),
    landsat7T2 = ee.ImageCollection("LANDSAT/LE07/C01/T2_SR"),
    sentinel = ee.ImageCollection("COPERNICUS/S2_SR");
/***** End of imports. If edited, may not auto-convert in the playground. *****/


var utils = require('users/fabrice/eartheng:utils.js'); 

/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
var maskS2clouds = function(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask);
}

// This example demonstrates the use of the pixel QA band to mask
// clouds in surface reflectance (SR) data.  It is suitable
// for use with any of the Landsat SR datasets.

// Function to cloud mask from the pixel_qa band of Landsat 8 SR data.
var maskL8sr = function(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;

  // Get the pixel QA band.
  var qa = image.select('pixel_qa');

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0));

  // Return the masked image, scaled to reflectance, without the QA bands.
  return image.updateMask(mask)
      .select("B[0-9]*")
      .copyProperties(image, ["system:time_start"]);
}

// This example demonstrates the use of the Landsat 4, 5 or 7
// surface reflectance QA band to mask clouds.

var cloudMaskL457 = function(image) {
  var qa = image.select('pixel_qa');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
          .and(qa.bitwiseAnd(1 << 7))
          .or(qa.bitwiseAnd(1 << 3))
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  return image.updateMask(cloud.not()).updateMask(mask2);
};


var getLonLatOffset = function(centre, latOffset, longOffset) {
  var longitude=centre.coordinates().get(0); 
  var latitude=centre.coordinates().get(1); 
  
  var rEarth=6378137; 
  
  var dLat =latOffset/rEarth;
  var dLon=ee.Number(longOffset).divide(ee.Number(latitude).divide(180).multiply(Math.PI).cos().multiply(rEarth)); 

  //OffsetPosition, decimal degrees
  var newLat= ee.Number(latitude).add(dLat * (180/Math.PI)); 
  var newLon=ee.Number(longitude).add(dLon.multiply(180/Math.PI));
  
  
  return ee.Geometry.Point(newLon, newLat);
}

var dataExists = function(geom, img) {
  var lazyEval = img.reduceNeighborhood({
    reducer: ee.Reducer.mean(),
    kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
  });
  
  var val = lazyEval.reduceRegion(
    ee.Reducer.first(),
    geom, 
    30
  ).get('B1_mean');  
  
  return ee.Algorithms.If(val, 1, 0); 
}

var getImageWithData = function(geom, imgColl) {
  
}

function extractLandsat8Data(feature) {

  var geom=feature.geometry() 

  var date = ee.Date(feature.get('obs_time')); 

  var dateRange = ee.List([
    date.advance(-60, 'day'), 
    date.advance(60, 'day')
  ]);
  
  var landsatData = ee.Dictionary({
    l8 : landsat8,
  }); 
  

  
  var extractLandsatImg = function(imgKey, iterativeFeat) {
    var newf = ee.Feature(iterativeFeat); 
    
    // Get landsat image by image key, and filter 
    var img = ee.ImageCollection(landsatData.get(imgKey))
      .filterDate(dateRange.get(0), dateRange.get(1))
      .filterBounds(geom)
      .map(maskL8sr); 
    
    // get relative time with each image 
    var imgWithDateDist = img.map(function(image){
      return image.set(
          'dateDist',
          ee.Number(image.get('system:time_start')).subtract(date.millis()).abs()
        );
    }); 
    
    // Get image closest to specified date
    var singleImg = imgWithDateDist
      .sort('dateDist')
      .first(); 
    
    var finalImg = ee.Image(ee.Algorithms.If(singleImg, 
      singleImg, 
      ee.Image(0)
    )); 
    
    // Get all relevant band names from image 
    var bandNames = ee.ImageCollection(landsatData.get(imgKey))
      .first() // guarnteed to have data
      .bandNames()
      .filter(ee.Filter.stringStartsWith('item', 'B'));
    
    // Get date of final image chosen  
    var dateOfImg = ee.Algorithms.If(singleImg, 
      ee.Date(finalImg.get('system:time_start')), 
      ee.String('No data')
    );
    
    // Add mean and stdDev property for each band in image 
    var addProp = function(bandName, iterativeFeat) {
      var newf=ee.Feature(iterativeFeat); 
      
      // Get summaries for mean and standard deviation 
      var lazyEvalMean = finalImg.reduceNeighborhood({
        reducer: ee.Reducer.mean(),
        kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
      });
      
      var lazyEvalStdDev = finalImg.reduceNeighborhood({
        reducer: ee.Reducer.stdDev(),
        kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
      });
      
      // Get summary mean surface reflectance of 3x3 grid 
      var mean = ee.Algorithms.If(singleImg, 
        lazyEvalMean.reduceRegion(
          ee.Reducer.first(),
          geom, 
          30
        ).get(ee.String(bandName).cat(ee.String('_mean'))), 
        0
      ); 
      
      // Get standard deviation of all values in 3x3 grid 
      var stdDev = ee.Algorithms.If(singleImg, 
        lazyEvalStdDev.reduceRegion(
          ee.Reducer.first(),
          geom, 
          30
        ).get(ee.String(bandName).cat(ee.String('_stdDev'))), 
        0
      ); 
      
      // Create new property names
      var newMeanName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_sf_mean');
      
      var newStdDevName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_sf_sd'); 
      
      var dateLabel = ee.String(imgKey).cat('_date_of_image'); 
      
      return ee.Feature(ee.Algorithms.If(mean,
        newf.set(newMeanName, mean).set(newStdDevName, stdDev).set(dateLabel, dateOfImg),
        newf.set(newMeanName, ee.String('No data')).set(newStdDevName, ee.String('No data')).set(dateLabel, dateOfImg))); 
    };  
    
    return ee.Feature(bandNames.iterate(addProp, newf));
  };
  
  return ee.Feature(landsatData.keys().iterate(extractLandsatImg, feature));  
} 






function extractLandsat457Data(feature) {
  
  var geom=feature.geometry() 

  var date = ee.Date(feature.get('obs_time')); 

  var dateRange = ee.List([
    date.advance(-60, 'day'), 
    date.advance(60, 'day')
  ]);
  
  var landsatData = ee.Dictionary({
    l5 : landsat5, 
    l7 : landsat7
  }); 
  

  
  var extractLandsatImg = function(imgKey, iterativeFeat) {
    var newf = ee.Feature(iterativeFeat); 
    
    // Get landsat image by image key, and filter 
    var img = ee.ImageCollection(landsatData.get(imgKey))
      .filterDate(dateRange.get(0), dateRange.get(1))
      .filterBounds(geom)
      .map(cloudMaskL457); 
    
    // get relative time with each image 
    var imgWithDateDist = img.map(function(image){
      return image.set(
          'dateDist',
          ee.Number(image.get('system:time_start')).subtract(date.millis()).abs()
        );
    }); 
    
    // Get image closest to specified date
    var singleImg = imgWithDateDist
      .sort('dateDist')
      .first(); 
    
    var finalImg = ee.Image(ee.Algorithms.If(singleImg, 
      singleImg, 
      ee.Image(0)
    )); 
    
    // Get all relevant band names from image 
    var bandNames = ee.ImageCollection(landsatData.get(imgKey))
      .first() // guarnteed to have data
      .bandNames()
      .filter(ee.Filter.stringStartsWith('item', 'B'));
    
    // Get date of final image chosen  
    var dateOfImg = ee.Algorithms.If(singleImg, 
      ee.Date(finalImg.get('system:time_start')), 
      ee.String('No data')
    );
    
    // Add mean and stdDev property for each band in image 
    var addProp = function(bandName, iterativeFeat) {
      var newf=ee.Feature(iterativeFeat); 
      
      // Get summaries for mean and standard deviation 
      var lazyEvalMean = finalImg.reduceNeighborhood({
        reducer: ee.Reducer.mean(),
        kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
      });
      
      var lazyEvalStdDev = finalImg.reduceNeighborhood({
        reducer: ee.Reducer.stdDev(),
        kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
      });
      
      // Get summary mean surface reflectance of 3x3 grid 
      var mean = ee.Algorithms.If(singleImg, 
        lazyEvalMean.reduceRegion(
          ee.Reducer.first(),
          geom, 
          30
        ).get(ee.String(bandName).cat(ee.String('_mean'))), 
        0
      ); 
      
      // Get standard deviation of all values in 3x3 grid 
      var stdDev = ee.Algorithms.If(singleImg, 
        lazyEvalStdDev.reduceRegion(
          ee.Reducer.first(),
          geom, 
          30
        ).get(ee.String(bandName).cat(ee.String('_stdDev'))), 
        0
      ); 
      
      // Create new property names
      var newMeanName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_sf_mean');
      
      var newStdDevName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_sf_sd'); 
      
      var dateLabel = ee.String(imgKey).cat('_date_of_image'); 
      
      return ee.Feature(ee.Algorithms.If(mean,
        newf.set(newMeanName, mean).set(newStdDevName, stdDev).set(dateLabel, dateOfImg),
        newf.set(newMeanName, ee.String('No data')).set(newStdDevName, ee.String('No data')).set(dateLabel, dateOfImg))); 
    };  
    
    return ee.Feature(bandNames.iterate(addProp, newf));
  };
  
  return ee.Feature(landsatData.keys().iterate(extractLandsatImg, feature)); 
}


function extractSentinel2A(feature) {
    
  var geom=feature.geometry() 
    
  var date = ee.Date(feature.get('obs_time')); 

  var dateRange = ee.List([
    date.advance(-60, 'day'), 
    date.advance(60, 'day')
  ]);
  
  var data = ee.Dictionary({
    S2a : sentinel, 
  });
  
  var extractSentinel2AImg = function(imgKey, iterativeFeat) {
    var newf = ee.Feature(iterativeFeat); 
    
    // Get landsat image by image key, and filter 
    var img = ee.ImageCollection(data.get(imgKey))
      .filterDate(dateRange.get(0), dateRange.get(1))
      .filterBounds(geom)
      .map(maskS2clouds); 
    
    // get relative time with each image 
    var imgWithDateDist = img.map(function(image){
      return image.set(
          'dateDist',
          ee.Number(image.get('system:time_start')).subtract(date.millis()).abs()
        );
    }); 
    
    // Get image closest to specified date
    var singleImg = imgWithDateDist
      .sort('dateDist')
      .first(); 
    
    var finalImg = ee.Image(ee.Algorithms.If(singleImg, 
      singleImg, 
      ee.Image(0)
    )); 
    
    // Get all relevant band names from image 
    var bandNames = ee.ImageCollection(data.get(imgKey))
      .first() // guarnteed to have data
      .bandNames()
      .filter(ee.Filter.stringStartsWith('item', 'B'));
    
    // Get date of final image chosen  
    var dateOfImg = ee.Algorithms.If(singleImg, 
      ee.String(finalImg.get('system:index')), 
      ee.String('No data')
    );
    
    // Add mean and stdDev property for each band in image 
    var addProp = function(bandName, iterativeFeat) {
      var newf=ee.Feature(iterativeFeat); 
      
      // Get summaries for mean and standard deviation 
      var lazyEvalMean = finalImg.reduceNeighborhood({
        reducer: ee.Reducer.mean(),
        kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
      });
      
      var lazyEvalStdDev = finalImg.reduceNeighborhood({
        reducer: ee.Reducer.stdDev(),
        kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
      });
      
      // Get summary mean surface reflectance of 3x3 grid 
      var mean = ee.Algorithms.If(singleImg, 
        lazyEvalMean.reduceRegion(
          ee.Reducer.first(),
          geom, 
          30
        ).get(ee.String(bandName).cat(ee.String('_mean'))), 
        0
      ); 
      
      // Get standard deviation of all values in 3x3 grid 
      var stdDev = ee.Algorithms.If(singleImg, 
        lazyEvalStdDev.reduceRegion(
          ee.Reducer.first(),
          geom, 
          30
        ).get(ee.String(bandName).cat(ee.String('_stdDev'))), 
        0
      ); 
      
      // Create new property names
      var newMeanName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_sf_mean');
      
      var newStdDevName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_sf_sd'); 
      
      var dateLabel = ee.String(imgKey).cat('_date_of_image'); 
      
      return ee.Feature(ee.Algorithms.If(mean,
        newf.set(newMeanName, mean).set(newStdDevName, stdDev).set(dateLabel, dateOfImg),
        newf.set(newMeanName, ee.String('No data')).set(newStdDevName, ee.String('No data')).set(dateLabel, dateOfImg))); 
    };  
    
    return ee.Feature(bandNames.iterate(addProp, newf));
  };
  
  return ee.Feature(data.keys().iterate(extractSentinel2AImg, feature)); 
}


var starTransectsExtended = starTransects
  .map(extractLandsat457Data, true)
  .map(extractLandsat8Data, true)
  .map(extractSentinel2A, true)
  .map(utils.repLandsat457Data, true)
  .map(utils.repLandsat8Data, true); 
  
Export.table.toDrive({
  collection: starTransectsExtended,
  description: 'updated_star_transects',
  fileFormat: 'CSV'
});



var starTransectFeat = starTransects.first();

print(starTransectFeat); 

var test = ee.Feature(ee.Geometry.Point(149.5714, -23.6539), {obs_time : '2016-11-11', landsat_img_date : '2016-10-26'})

print(utils.repLandsat8Data(extractLandsat457Data(extractSentinel2A(starTransectFeat)))); 

// print(starTransectsExtended); 

// print(ee.ImageCollection(landsatData.get('l7')).filterBounds(starTransectFeat.geometry())); 

var date = ee.Date(test.get('landsat_img_date')); 


// print(starTransectFeat); 


var dateRange = ee.List([
  date.advance(0, 'year'), 
  date.advance(1, 'day')
]);

// Get landsat image by image key, and filter 
var img = landsat7.
  filterDate(dateRange.get(0), 
        dateRange.get(1)).
  filterBounds(test.geometry()); 
  
var imgWithDateDist = img.map(function(image){
  return image.set(
      'dateDist',
      ee.Number(image.get('system:time_start')).subtract(date.millis()).abs()
    );
  });

// cloud mask then get median 
var composite=imgWithDateDist.
  sort('dateDist').
  first();
  
print(composite); 

var lazyEvalMean = ee.Image(1).reduceNeighborhood({
        reducer: ee.Reducer.mean(),
        kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
});

print(lazyEvalMean);

var mean = lazyEvalMean.reduceRegion(
  ee.Reducer.first(),
  test.geometry(), 
  30
).get('B1_mean');


/*var texture = composite.reduceNeighborhood({
  reducer: ee.Reducer.mean(),
  kernel: ee.Kernel.square({radius : 30, units: 'meters', normalize : true}),
});
*/ 

// print(texture); 

/*var visualization = {
  min: 0.0,
  max: 0.3,
  bands: ['B4_mean', 'B3_mean', 'B2_mean'],
};




Map.addLayer(texture, visualization); 

Map.addLayer(starTransectFeat.geometry()); */
  
  
    
var unprocessedDate = ee.String('NA-NA-NA'); 
  
var captureDate = unprocessedDate.match('[0-9]{2}'); 

print(captureDate); 

print(ee.Algorithms.If(captureDate, true, false)); 

  




