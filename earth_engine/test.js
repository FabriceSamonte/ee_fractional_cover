/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #d63000 */ee.Geometry.MultiPoint(),
    imageCollection = ee.ImageCollection("LANDSAT/LC08/C01/T1"),
    table = ee.FeatureCollection("users/fabrice/fractional_components");
/***** End of imports. If edited, may not auto-convert in the playground. *****/


print(table);

var city = ee.Geometry.Point(-106.48207, 31.76247);

print(city); 

Map.addLayer(city);

// Dates of interest

var start = ee.Date('2013-05-30');
var end = ee.Date('2014-05-30');

var elPaso = ee.ImageCollection("LANDSAT/LC08/C01/T1")
.filterBounds(city)
.filterDate(start, end)
.sort('CLOUD_COVER', false); 

print(elPaso);


// Get least cloudy image

var best = ee.Image(elPaso.sort('CLOUD_COVER').first());

print(elPaso.sort('CLOUD_COVER')); 


/* 
- Photosyntetic coverage 

https://field.jrsrp.com 

star_transects

upload to EE, then pull the pixels 

Function for each star transect, filter landsat image collection to each 
bound, and extract the pixel values 

Model creating fractional land cover

Take the field data locations, intersect with landsat in EE, develop model to model the field measurements 
from the 

Pull off earth engine, and take field data then do your own thing. Slotting in different
datasets 

Using training data to create model. 

- Tree height coverage




*/ 


