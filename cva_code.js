// ==================================================== //
// Parameters for Machine learning-based prediction for coastal vulnerability assessment and mapping//
// Parameters adopted based on G ornitz's CVI model
// ==================================================== // 
// • Coastal elevation ==> OK 
// • Coastal slope ==> OK 
// • Bathymetry ==> OK  
// • Shoreline change ==> OK
// • Coastal geomorphology ==> OK  
// • Coastal land use ==> OK 
// • Mean sea level ==> OK
// • Mean tidal range ==> OK
// • Mean Significant Wave Height ==> OK 
// • Coastal inundation ==> OK
// • Landsubsidence ==> OK
// • Geology ==> OK
// =====================================================//

//tes sonarcube 1

// Research boundary ==> Coastal Cisadane 
Map.setCenter(106.5774, -6.0292, 10);

// • Coastal elevation • OK
// Access data USGS SRTM data
//var dataset_srtm = ee.Image('USGS/SRTMGL1_003');

// Clip Research Boundary for Coastal elevation
var Clip_srtm = demnas.clipToCollection(Box);
var elevation = Clip_srtm.select('b1').rename('elevation').float();
Map.addLayer(elevation, {min: 0, max: 10}, 'Coastal elevation', false); 

// • Coastal slope • OK
var slope = ee.Terrain.slope(elevation).rename('slope').float();
Map.addLayer(slope, {min: 0, max: 5}, 'Coastal slope', false); 

// • Bathymetry •
//var dataset_bathymetry = ee.Image('NOAA/NGDC/ETOPO1');
var Clip_bathymetry = batnas.clipToCollection(Box);
var bathymetry = Clip_bathymetry.select('b1').rename('bathymetry').float();
var elevationVis = {
  min: -50.0,
  max: 10.0,
  palette: ['011de2', 'afafaf', '3603ff', 'fff477', 'b42109'],
};
Map.addLayer(bathymetry, elevationVis, 'Bathymetry', false);

// • Coastal geomorphology •  
//var dataset_landform = ee.Image('CSP/ERGo/1_0/Global/SRTM_landforms');
var Clip_landform = dataset_landform.clipToCollection(Box);
//print(dataset_landform)
var landforms = Clip_landform.select('b1').rename('landforms').float();
var landformsVis = {
  min: 11.0,
  max: 42.0,
  palette: [ 
    '141414', '383838', '808080', 'EBEB8F', 'F7D311', 'AA0000', 'D89382',
    'DDC9C9', 'DCCDCE', '1C6330', '68AA63', 'B5C98E', 'E1F0E5', 'a975ba',
    '6f198c'
  ],
};
Map.addLayer(landforms, landformsVis, 'Coastal geomorphology', false);

// • Coastal land use •
/// clip for Landuse Lancover (LULC)
var dataset_lulc = ee.ImageCollection("ESA/WorldCover/v100").first();
var clip_lulc = dataset_lulc.clipToCollection(Box);
var landcover = clip_lulc.select('Map').rename('landcover').float();
var visual_lulc = {bands: ['landcover']}; 
Map.addLayer(landcover, visual_lulc, 'Coastal land use', false); 

// • Mean sea level •
var clip_MSL = MSL.clipToCollection(Box);
var MSL_C = clip_MSL.select('b1').rename('clip_MSL').float();
Map.addLayer(MSL_C, {min: 0, max: 1}, 'Mean sea level', false);

// • Shoreline change •
var clip_SC = SC.clipToCollection(Box);
var SC_C = clip_SC.select('b1').rename('clip_SC').float();
Map.addLayer(SC_C, {min: 0, max: 1}, 'Shoreline change', false);
 
// • Coastal inundation • 
var gfd = ee.ImageCollection('GLOBAL_FLOOD_DB/MODIS_EVENTS/V1').sum().toDouble();
var clip_gfd = gfd.clipToCollection(Box);
// Map all floods to generate the satellite-observed historical flood plain. 

var gfdFloodedSum = clip_gfd.select('flooded').rename('flooded').float();
Map.addLayer(gfdFloodedSum, {min: 0, max: 10}, 'Coastal inundation', false);
  
// • Mean tidal range 
var clip_MTR = MTR.clipToCollection(Box); 
//print(clip_MTR);
var MTR_C = clip_MTR.select('b1').rename('clip_MTR').float(); 
Map.addLayer(MTR_C, {min: 0, max: 1}, 'Mean tidal range', false);

// • Mean Significant Wave Height  
var clip_MSWH = MSWH.clipToCollection(Box);
var MSWH_C = clip_MSWH.select('b1').rename('clip_MSWH').float();
Map.addLayer(MSWH_C, {min: 0, max: 1}, 'Mean significant wave height', false);

// • Landsubsidence 
var clip_LS = LS.clipToCollection(Box);
var LS_C = clip_LS.select('b1').rename('clip_LS').float();
Map.addLayer(LS_C, {min: 0, max: 1}, 'Landsubsidence', false);

// • Geology 
var clip_geol = Geol.clipToCollection(Box);
var Geol_lc = clip_geol.select('b1').rename('clip_geol').float();
Map.addLayer(Geol_lc, {min: 0, max: 1}, 'Geology', false);

//////// variable gabungan semua nya ////////// 
/////// Layers sta cking data processing ///////  
 
var GDL_N = ee.Image.cat(elevation, slope, bathymetry, landforms, landcover, MSL_C, SC_C, gfdFloodedSum, MTR_C, MSWH_C, LS_C, Geol_lc); 

// Training data set processing and accuracy assessment
// Remap the land cover class values to a 0-based sequential series.
var bands = ['elevation', 'slope', 'bathymetry', 'landforms', 'landcover', 'clip_MSL', 'clip_SC', 'flooded', 'clip_MTR', 'clip_MSWH', 'clip_LS', 'clip_geol'];

// get one image
// calculate the min and max value of an image
var minMax = GDL_N.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: Box,
  scale: 10,
  maxPixels: 10e13,
}); 
// use unit scale to normalize the pixel values
var composite = ee.ImageCollection.fromImages(
  GDL_N.bandNames().map(function(name){
    name = ee.String(name);
    var bands = GDL_N.select(name);
    return bands.unitScale(ee.Number(minMax.get(name.cat('_min'))), ee.Number(minMax.get(name.cat('_max'))))
                // eventually multiply by 100 to get range 0-100
                //.multiply(1);
})).toBands().rename(GDL_N.bandNames());
print(composite,'composite');
//Map.addLayer(composite); 

// Sample the input imagery to get a FeatureCollection of training data. 
var gcp = composite.select(bands).sampleRegions({
  collection: newfc,  
  properties: ['ID_CVA'], 
  scale: 10
}); 
   
gcp = gcp.randomColumn();  

var split = 0.7;  // Roughly 70% training, 30% testing.
var training = gcp.filter(ee.Filter.lt('random', split));
print(gcp.size(), 'Total Sample');
var validationGcp = gcp.filter(ee.Filter.gte('random', split)); 
print(training.size(), 'Training sample');
print(validationGcp.size(), 'Validation sample');

// Overlay the point on the image to get training data.

// Make a Random Forest classifier and train it. 
var Classifier = ee.Classifier.smileRandomForest(10).train({
  features: training,  
  classProperty: 'ID_CVA',    
  inputProperties: bands  
});


// ========================================== //
// =========== Optimasi Parameters ========== //
// ========================================== //

// ============ Feature Importance ========== //

// Run .explain() to see what the classifer looks like
print(Classifier.explain())

// Calculate variable importance
var importance = ee.Dictionary(Classifier.explain().get('importance'))

// Calculate relative importance
var sum = importance.values().reduce(ee.Reducer.sum())

var relativeImportance = importance.map(function(key, val) {
   return (ee.Number(val).multiply(1)).divide(sum)
  })
print(relativeImportance)

// Create a FeatureCollection so we can chart it
var importanceFc = ee.FeatureCollection([
  ee.Feature(null, relativeImportance)
])

var chart = ui.Chart.feature.byProperty({
  features: importanceFc
}).setOptions({
      title: 'Feature Importance',
      vAxis: {title: 'Importance'},
      hAxis: {title: 'Feature'}
  })
print(chart)

// ============================================== //
// ========= Tuning Multiple Parameters ========= //
// ============================================== //
// We can tune many parameters together using
// nested map() functions
// Let's tune 2 parameters
// numTrees and bagFraction 

// Tune the numberOfTrees parameter.
// Tuning Multiple Parameters
// We can tune many parameters together using
// nested map() functions
// Let's tune 2 parameters
// numTrees and bagFraction

var numTreesList = ee.List.sequence(10, 200, 10);
var bagFractionList = ee.List.sequence(0.1, 1.0, 0.1);
var accuracies = numTreesList.map(function(numTrees) {
  var classifier = ee.Classifier.smileRandomForest(numTrees)
      .train({
        features: training,
        classProperty: 'ID_CVA',
        inputProperties: composite.bandNames()
      });

  // Here we are classifying a table instead of an image
  // Classifiers work on both images and tables
  return validationGcp
    .classify(classifier)
    .errorMatrix('ID_CVA', 'classification')
    .accuracy();
});

var chart = ui.Chart.array.values({
  array: ee.Array(accuracies),
  axis: 0,
  xLabels: numTreesList
  }).setOptions({
      title: 'Hyperparameter Tuning for the number of Trees Parameters',
      vAxis: {title: 'Validation Accuracy'},
      hAxis: {title: 'Number of Tress', gridlines: {count: 15}}
  });
print(chart)

var accuracies = numTreesList.map(function(numTrees) {
  return bagFractionList.map(function(bagFraction) {
     var classifier = ee.Classifier.smileRandomForest({
       numberOfTrees: numTrees,
       bagFraction: bagFraction
     })
      .train({
        features: training,
        classProperty: 'ID_CVA',
        inputProperties: composite.bandNames()
      });

    // Here we are classifying a table instead of an image
    // Classifiers work on both images and tables
    var accuracy = validationGcp
      .classify(classifier)
      .errorMatrix('ID_CVA', 'classification')
      .accuracy();
    return ee.Feature(null, {'accuracy': accuracy,
      'numberOfTrees': numTrees,
      'bagFraction': bagFraction})
  })
}).flatten()
var resultFc = ee.FeatureCollection(accuracies)

// Export the result as CSV
Export.table.toDrive({
  collection: resultFc,
  description: 'Multiple_Parameter_Tuning_Results',
  folder: 'earthengine',
  fileNamePrefix: 'numtrees_bagfraction',
  fileFormat: 'CSV'}) 
  
  
/* ===================================================
          DATA CLASSIFICATION AND VISUALIZATION OPTIMATION
   =================================================== */
// Define a palette for the Coastal vulnerability assessment.   
var palette = [
  '362fd6', // Sangat Rendah (1)  
  '3999d6', // Rendah (2)  
  '21d62a', // Menengah (3)
  'e3ff29', // Tinggi (4)  
  'd63000', // Sangat Tinggi (5)
  ]; 

// Make a Random Forest classifier and train it. 
var Classifier2 = ee.Classifier.smileRandomForest(110).train({
  features: training,  
  classProperty: 'ID_CVA',    
  inputProperties: bands  
});

var Class_cva = composite.select(bands).classify(Classifier2);
Map.addLayer(Class_cva, {min: 1, max: 5, palette: palette}, 'Coastal vulnerability assessment', true); 
Map.addLayer(Box, {color: 'white'}, 'Box', false, 0.5);
// Get information about the trained classifier.
// print('Results of trained classifier', trainedClassifier.explain());

//Add LEGEND

// set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: "Legend CVA",
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
legend.add(legendTitle);
// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
 
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
//  Palette with the colors
//var palette =['FF0000', '22ff00', '1500ff', '1500ff','1500ff'];

var palette = [
  '362fd6', // Sangat Rendah (1)  
  '3999d6', // Rendah (2)  
  '21d62a', // Menengah (3)
  'e3ff29', // Tinggi (4)  
  'd63000', // Sangat Tinggi (5)
  ]; 
 
// name of the legend
var names = ['Very Low', 'Low','Moderate','High','Very High'];
 
// Add color and and names
for (var i = 0; i < 5; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
 
// add legend to map (alternatively you can also print the legend to the console)
Map.add(legend);






// Get a confusion matrix and overall accuracy for the training sample.
var trainAccuracy = Classifier2.confusionMatrix();
// print('Training error matrix', trainAccuracy);
//print('Training overall accuracy', trainAccuracy.accuracy());

// Get a confusion matrix and overall accuracy for the validation sample.
validationGcp = validationGcp.classify(Classifier2);
var validationAccuracy = validationGcp.errorMatrix('ID_CVA', 'classification');
//print('Validation error matrix', validationAccuracy);
print('Validation overall accuracy', validationAccuracy.accuracy());

// Export a cloud-optimized GeoTIFF // Donwload_data.
Export.image.toDrive({
  image: Class_cva,
  description: 'Class_Coastal_Vuln_Assessments_Smile_Random_forest',
  scale: 30,
  region: Box,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});   