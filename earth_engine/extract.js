// dataset imports from Google EE 
var starTransects = ee.FeatureCollection("users/fabrice/fractional_components"),
    landsat5 = ee.ImageCollection("LANDSAT/LT05/C01/T1_SR"),
    landsat7 = ee.ImageCollection("LANDSAT/LE07/C01/T1_SR"),
    landsat8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR"),
    MOD09A1Collection = ee.ImageCollection("MODIS/006/MOD09A1"),
    MCD43A4Collection = ee.ImageCollection("MODIS/006/MCD43A4");

function bitwiseExtract(value, fromBit, toBit) {
  if (toBit === undefined) toBit = fromBit;
  var maskSize = ee.Number(1).add(toBit).subtract(fromBit);
  var mask = ee.Number(1).leftShift(maskSize).subtract(1);
  return value.rightShift(fromBit).bitwiseAnd(mask);
}

function maskMOD09A1Clouds(image) {
  var qa = image.select('StateQA');
  var cloudState = bitwiseExtract(qa, 0, 1); 
  var cloudShadowState = bitwiseExtract(qa, 2);
  var cirrusState = bitwiseExtract(qa, 8, 9);
  var aerosolQuantity = bitwiseExtract(qa, 6, 7); 
  var mask = cloudState.eq(0) // Clear
    .and(cloudShadowState.eq(0)) // No cloud shadow
    .and(cirrusState.eq(0)) // No cirrus
    .and(aerosolQuantity.lte(1)); // No aerosol quantity
  var maskedImage = image.updateMask(mask);
  
  return maskedImage; 
}

// This example demonstrates the use of the pixel QA band to mask
// clouds in surface reflectance (SR) data.  It is suitable
// for use with any of the Landsat SR datasets.

// Function to cloud mask from the pixel_qa band of Landsat 8 SR data.
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;

  // Get the pixel QA band.
  var qa = image.select('pixel_qa');

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0));

  // Return the masked image, scaled to reflectance, without the QA bands.
  return image.updateMask(mask).divide(10000)
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


// extracts MCD43A4 and MOD09A1 values from all bands
function extractMODIS(feature) {
  var geom=feature.geometry(); 
  
  // get obs_time from feature 
  var date=ee.Date(feature.get('obs_time'));
  
  // create 16 day date range from given observation time
  var dateRange=ee.List([
    date.advance(-8, 'day'),
    date.advance(8, 'day')
  ]);
  
  // filter and cloud-mask image collection 
  var MOD09A1img = MOD09A1Collection.
  filterDate(dateRange.get(0), 
            dateRange.get(1)).
  filterBounds(geom).
  map(maskMOD09A1Clouds).
  median();
  
  var MCD43A4img = MCD43A4Collection.
  filterDate(dateRange.get(0), 
            dateRange.get(1)).
  filterBounds(geom).
  median(); 
  
  // Hard Coded 
  var MOD09A1BandNames = ee.List(["sur_refl_b01", "sur_refl_b02", "sur_refl_b03", "sur_refl_b04", "sur_refl_b05", "sur_refl_b06", "sur_refl_b07"]);
  
  var MCD43A4BandNames = MCD43A4img.bandNames(); 
  
  var addMOD09A1Prop = function(bandName, iterativeFeat) {
    var newf = ee.Feature(iterativeFeat); 
    
    var regionReduced = MOD09A1img.reduceRegion(
        ee.Reducer.first(),
        geom, 
        500
    );
    
    // extract band value 
    var val = ee.Algorithms.If(regionReduced, 
      regionReduced.get(bandName), 
      null
    );
    
    // Create new property name 
    var newName = ee.String('MOD09A1_').cat(ee.String(bandName)) ;  
    
    return ee.Feature(ee.Algorithms.If(val,
        newf.set(newName, ee.Number(val)),
        newf.set(newName, ee.String('No Data')))); 
  }
  
  var addMCD43A4Prop = function(bandName, iterativeFeat) {
    var newf = ee.Feature(iterativeFeat); 
    
    var regionReduced = MCD43A4img.reduceRegion(
        ee.Reducer.first(),
        geom, 
        500
    );
    
    // extract band value 
    var val = ee.Algorithms.If(regionReduced, 
      regionReduced.get(bandName), 
      null
    );
    
    // Create new property name 
    var newName = ee.String(bandName);  
    
    return ee.Feature(ee.Algorithms.If(val,
        newf.set(newName, ee.Number(val)),
        newf.set(newName, ee.String('No Data')))); 
  }
  
  
  var retFeature = ee.Feature(MOD09A1BandNames.iterate(addMOD09A1Prop, feature));
  retFeature = ee.Feature(MCD43A4BandNames.iterate(addMCD43A4Prop, retFeature)); 
  
  return retFeature; 
}

function extractAvgLandsat8(feature) {
  
  var geom=feature.geometry() 
  
  // 3x3 Grid around geom 
  var grid=ee.FeatureCollection([
    feature, 
    ee.Feature(getLonLatOffset(geom, 30, 30), {name : 'NE'}),
    ee.Feature(getLonLatOffset(geom, 30, 0), {name : 'N'}), 
    ee.Feature(getLonLatOffset(geom, 0, 30), {name : 'E'}), 
    ee.Feature(getLonLatOffset(geom, 30, -30), {name : 'NW'}), 
    ee.Feature(getLonLatOffset(geom, -30, 30), {name : 'SE'}), 
    ee.Feature(getLonLatOffset(geom, 0, -30), {name : 'W'}), 
    ee.Feature(getLonLatOffset(geom, -30, 0), {name : 'S'}), 
    ee.Feature(getLonLatOffset(geom, -30, -30), {name : 'SW'}), 
  ]);
    
  // get obs_time from feature 
  var date=ee.Date(feature.get('obs_time'));
  
  // create 20 day date range from given observation time
  var dateRange=ee.List([
    date.advance(-30, 'day'),
    date.advance(30, 'day')
  ]);
  
  // filter landsat 5 T1 SR by date range + star transect location 
  var img=landsat8.
  filterDate(dateRange.get(0), 
            dateRange.get(1)).
  filterBounds(geom); 
  
  // cloud mask then take median for each band 
  var composite=img.
    map(maskL8sr).
    median(); 
  
  // Hard coded band names 
  var bandNames = ee.List(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B10', 'B11']);
  
  var init=ee.Feature(geom);
  
  var addProp = function(bandName, iterativeFeat) {
    var newf=ee.Feature(iterativeFeat); 
    
    var extractPixelValue = function(gridFeature) {
      var gridFeatureGeom=gridFeature.geometry(); 
      
      var value=composite.reduceRegion(
        ee.Reducer.first(),
        gridFeatureGeom, 
        30
      ); 
      
      // initialize new feature 
      var ini=ee.Feature(gridFeatureGeom);
      
      // extract band value 
      var val=ee.Algorithms.If(value, 
        value.get(bandName), 
        null
      );
      
      return ee.Feature(ee.Algorithms.If(val,
        ini.set(ee.String(bandName), ee.Number(val)),
        ini.set(ee.String(bandName), 0))); 
    }
    
    // Extract band values for each point in 3x3 grid (gets a FeatureCollection) 
    var summaryPixels = grid.map(extractPixelValue); 
    
    // Get summary mean surface reflectance of 3x3 grid 
    var mean= summaryPixels.aggregate_mean(bandName); 
    
    // Create new property name 
    var newName = ee.String('L8_').cat(ee.String(bandName)).cat('_sf_mean');  
    
    return ee.Feature(ee.Algorithms.If(mean,
      newf.set(newName, mean),
      newf.set(newName, ee.String('No data')))); 
  };  
  
  return ee.Feature(bandNames.iterate(addProp, feature)); 
}

function extractAvgLandsat7(feature) {
  
  var geom=feature.geometry() 
  
  // 3x3 Grid around geom 
  var grid=ee.FeatureCollection([
    feature, 
    ee.Feature(getLonLatOffset(geom, 30, 30), {name : 'NE'}),
    ee.Feature(getLonLatOffset(geom, 30, 0), {name : 'N'}), 
    ee.Feature(getLonLatOffset(geom, 0, 30), {name : 'E'}), 
    ee.Feature(getLonLatOffset(geom, 30, -30), {name : 'NW'}), 
    ee.Feature(getLonLatOffset(geom, -30, 30), {name : 'SE'}), 
    ee.Feature(getLonLatOffset(geom, 0, -30), {name : 'W'}), 
    ee.Feature(getLonLatOffset(geom, -30, 0), {name : 'S'}), 
    ee.Feature(getLonLatOffset(geom, -30, -30), {name : 'SW'}), 
  ]);
    
  // get obs_time from feature 
  var date=ee.Date(feature.get('obs_time'));
  
  // create 20 day date range from given observation time
  var dateRange=ee.List([
    date.advance(-30, 'day'),
    date.advance(30, 'day')
  ]);
  
  // filter landsat 5 T1 SR by date range + star transect location 
  var img=landsat7.
  filterDate(dateRange.get(0), 
            dateRange.get(1)).
  filterBounds(geom); 
  
  // cloud mask then take median for each band 
  var composite=img.
    map(cloudMaskL457).
    median(); 
  
  // Hard coded band names 
  var bandNames = ee.List(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7']);
  
  var init=ee.Feature(geom);
  
  var addProp = function(bandName, iterativeFeat) {
    var newf=ee.Feature(iterativeFeat); 
    
    var extractPixelValue = function(gridFeature) {
      var gridFeatureGeom=gridFeature.geometry(); 
      
      var value=composite.reduceRegion(
        ee.Reducer.first(),
        gridFeatureGeom, 
        30
      ); 
      
      // initialize new feature 
      var ini=ee.Feature(gridFeatureGeom);
      
      // extract band value 
      var val=ee.Algorithms.If(value, 
        value.get(bandName), 
        null
      );
      
      return ee.Feature(ee.Algorithms.If(val,
        ini.set(ee.String(bandName), ee.Number(val)),
        ini.set(ee.String(bandName), 0))); 
    }
    
    // Extract band values for each point in 3x3 grid (gets a FeatureCollection) 
    var summaryPixels = grid.map(extractPixelValue); 
    
    // Get summary mean surface reflectance of 3x3 grid 
    var mean= summaryPixels.aggregate_mean(bandName); 
    
    // Create new property name 
    var newName = ee.String('L7_').cat(ee.String(bandName)).cat('_sf_mean');  
    
    return ee.Feature(ee.Algorithms.If(mean,
      newf.set(newName, mean),
      newf.set(newName, ee.String('No data')))); 
  };  
  
  return ee.Feature(bandNames.iterate(addProp, feature)); 
}


function extractAvgLandsat5(feature) {
  
  var geom=feature.geometry() 
  
  // 3x3 Grid around geom 
  var grid=ee.FeatureCollection([
    feature, 
    ee.Feature(getLonLatOffset(geom, 30, 30), {name : 'NE'}),
    ee.Feature(getLonLatOffset(geom, 30, 0), {name : 'N'}), 
    ee.Feature(getLonLatOffset(geom, 0, 30), {name : 'E'}), 
    ee.Feature(getLonLatOffset(geom, 30, -30), {name : 'NW'}), 
    ee.Feature(getLonLatOffset(geom, -30, 30), {name : 'SE'}), 
    ee.Feature(getLonLatOffset(geom, 0, -30), {name : 'W'}), 
    ee.Feature(getLonLatOffset(geom, -30, 0), {name : 'S'}), 
    ee.Feature(getLonLatOffset(geom, -30, -30), {name : 'SW'}), 
  ]);
    
  // get obs_time from feature 
  var date=ee.Date(feature.get('obs_time'));
  
  // create 20 day date range from given observation time
  var dateRange=ee.List([
    date.advance(-30, 'day'),
    date.advance(30, 'day')
  ]);
  
  // filter landsat 5 T1 SR by date range + star transect location 
  var img=landsat5.
  filterDate(dateRange.get(0), 
            dateRange.get(1)).
  filterBounds(geom); 
  
  // cloud mask then take median for each band 
  var composite=img.
    map(cloudMaskL457).
    median(); 
  
  // Hard coded band names, 
  var bandNames = ee.List(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7']);
  
  var init=ee.Feature(geom);
  
  var addProp = function(bandName, iterativeFeat) {
    var newf=ee.Feature(iterativeFeat); 
    
    var extractPixelValue = function(gridFeature) {
      var gridFeatureGeom=gridFeature.geometry(); 
      
      var value=composite.reduceRegion(
        ee.Reducer.first(),
        gridFeatureGeom, 
        30
      ); 
      
      // initialize new feature 
      var ini=ee.Feature(gridFeatureGeom);
      
      // extract band value 
      var val=ee.Algorithms.If(value, 
        value.get(bandName), 
        null
      );
      
      return ee.Feature(ee.Algorithms.If(val,
        ini.set(ee.String(bandName), ee.Number(val)),
        ini.set(ee.String(bandName), 0))); 
    }
    
    // Extract band values for each point in 3x3 grid (gets a FeatureCollection) 
    var summaryPixels = grid.map(extractPixelValue); 
    
    // Get summary mean surface reflectance of 3x3 grid 
    var mean= summaryPixels.aggregate_mean(bandName); 
    
    // Create new property name 
    var newName = ee.String('L5_').cat(ee.String(bandName)).cat('_sf_mean');  
    
    return ee.Feature(ee.Algorithms.If(mean,
      newf.set(newName, mean),
      newf.set(newName, ee.String('No data')))); 
  };  
  
  return ee.Feature(bandNames.iterate(addProp, feature)); 
}

// Map.addLayer(starTransects);



var landsatExtracted=ee.FeatureCollection(starTransects).
  map(extractMODIS, true). 
  map(extractAvgLandsat5, true).
  map(extractAvgLandsat7, true).
  map(extractAvgLandsat8, true);

Export.table.toDrive({
  collection: landsatExtracted,
  description: 'updated_star_transects',
  fileFormat: 'CSV'
});

print(landsatExtracted); 

var testFeat=ee.FeatureCollection(starTransects).first();


var testFeatGeom=testFeat.geometry();

var geomGrid=ee.FeatureCollection([
  testFeatGeom, 
  ee.Feature(getLonLatOffset(testFeatGeom, 30, 30), {name : 'NE'}),
  ee.Feature(getLonLatOffset(testFeatGeom, 30, 0), {name : 'N'}), 
  ee.Feature(getLonLatOffset(testFeatGeom, 0, 30), {name : 'E'}), 
  ee.Feature(getLonLatOffset(testFeatGeom, 30, -30), {name : 'NW'}), 
  ee.Feature(getLonLatOffset(testFeatGeom, -30, 30), {name : 'SE'}), 
  ee.Feature(getLonLatOffset(testFeatGeom, 0, -30), {name : 'W'}), 
  ee.Feature(getLonLatOffset(testFeatGeom, -30, 0), {name : 'S'}), 
  ee.Feature(getLonLatOffset(testFeatGeom, -30, -30), {name : 'SW'}), 
]);

Map.addLayer(geomGrid); 





var testFeatDate=ee.Date(testFeat.get('obs_time'));

var testDateRange=ee.List([
  testFeatDate.advance(-8, 'day'),
  testFeatDate.advance(8, 'day')
]); 

print(MOD09A1Collection); 

var MODBRDFimg = MCD43A4Collection.
  filterDate(testDateRange.get(0), 
            testDateRange.get(1)).
  filterBounds(testFeatGeom).
  median(); 
print(MODBRDFimg.bandNames()); 

var MODimg = MOD09A1Collection.
  filterDate(testDateRange.get(0), 
            testDateRange.get(1)).
  filterBounds(testFeatGeom).
  map(maskMOD09A1Clouds).
  median();
  
Map.addLayer(MODimg, {bands: ['sur_refl_b01', 'sur_refl_b04', 'sur_refl_b03'],
     gain: 0.07,
     gamma: 1.4
    });  
  
print(MODimg);

var img=landsat8;
  // .filterDate(testDateRange.get(0), 
  //          testDateRange.get(1))
  // .filterBounds(testFeatGeom);

var composite = img
    .map(maskL8sr)
    .median();
    
print(composite);

// Map.addLayer(composite, {bands: ['B3', 'B2', 'B1'], min: 0, max: 3000});

Map.addLayer(composite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3});
  
var value=MODimg.select('sur_refl_b01').reduceRegion(
  ee.Reducer.first(),
  testFeatGeom, 
  500
).
get('sur_refl_b01');


print(value); 

// print(value.get(name));
// print(img); 
// print(testFeatGeom)

 
// Map.addLayer(img);
Map.addLayer(testFeatGeom);
// Map.addLayer(landsatExtracted);

// print(extract); 