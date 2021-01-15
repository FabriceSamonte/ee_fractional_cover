/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var starTransects = ee.FeatureCollection("users/fabrice/fractional_components"),
    landsat5 = ee.ImageCollection("LANDSAT/LT05/C01/T1_SR"),
    landsat7 = ee.ImageCollection("LANDSAT/LE07/C01/T1_SR"),
    landsat8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
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

exports.repLandsat8Data = function(feature) {

  var geom=feature.geometry() 
  
  var unprocessedDate = ee.String(feature.get('landsat_img_date')); 
  
  var captureDate = unprocessedDate.match('[0-9]{2}'); 
  
   var date = ee.Date(ee.Algorithms.If(captureDate, 
    unprocessedDate,
    '1900-01-01' // Dummy date 
  ));

  var dateRange = ee.List([
    date, 
    date.advance(1, 'day')
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
      var newMeanName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_rep_sf_mean');
      
      var newStdDevName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_rep_sf_sd'); 
      
      var dateLabel = ee.String(imgKey).cat('_date_of_image'); 
      
      return ee.Feature(ee.Algorithms.If(mean,
        newf.set(newMeanName, mean).set(newStdDevName, stdDev),
        newf.set(newMeanName, ee.String('No data')).set(newStdDevName, ee.String('No data')))); 
    };  
    
    return ee.Feature(bandNames.iterate(addProp, newf));
  };
  
  return ee.Feature(landsatData.keys().iterate(extractLandsatImg, feature));  
} 






exports.repLandsat457Data = function(feature) {
  
  var geom=feature.geometry() 

  var unprocessedDate = ee.String(feature.get('landsat_img_date')); 
  
  var captureDate = unprocessedDate.match('[0-9]{2}'); 
  
  var date = ee.Date(ee.Algorithms.If(captureDate, 
    unprocessedDate,
    '1900-01-01' // Dummy date 
  ));
  
  var dateRange = ee.List([
    date, 
    date.advance(1, 'day')
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
      var newMeanName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_rep_sf_mean');
      
      var newStdDevName = ee.String(imgKey).cat('_').cat(ee.String(bandName)).cat('_rep_sf_sd'); 
      
      var dateLabel = ee.String(imgKey).cat('_date_of_image'); 
      
      return ee.Feature(ee.Algorithms.If(mean,
        newf.set(newMeanName, mean).set(newStdDevName, stdDev),
        newf.set(newMeanName, ee.String('No data')).set(newStdDevName, ee.String('No data')))); 
    };  
    
    return ee.Feature(bandNames.iterate(addProp, newf));
  };
  
  return ee.Feature(landsatData.keys().iterate(extractLandsatImg, feature)); 
}