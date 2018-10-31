const clonedeep = require('lodash.clonedeep')
// const data = require('./test.json');
const data = require('./rocque2.json');

const nameMap = {};

function compareCoords(lnglat1, lnglat2) {
  return lnglat1[0] === lnglat2[0] && lnglat1[1] === lnglat2[1]; 
}

data.features.forEach(f => {
  if (!nameMap[f.properties.name]) {
    nameMap[f.properties.name] = f
    nameMap[f.properties.name].geometry.coordinates = [nameMap[f.properties.name].geometry.coordinates]
  } else {
    nameMap[f.properties.name].geometry.coordinates = 
      [f.geometry.coordinates].concat(nameMap[f.properties.name].geometry.coordinates);
  }
});

const features = Object.values(nameMap);

require('fs').writeFileSync('./result.json', JSON.stringify({
  "type": "FeatureCollection",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, 
  "features": features.reduce((features, feature) => {
      let coords = feature.geometry.coordinates;
      let combinedCoords = coords.pop();
      let newSegment;

      while (coords.length) {        
        newSegment = coords.find(c => compareCoords(combinedCoords[0], c[0]));

        if (newSegment) {
          combinedCoords = newSegment.reverse().slice(0, -1).concat(combinedCoords);
          coords.splice(coords.indexOf(newSegment), 1);
          continue;
        }

        newSegment = coords.find(c => compareCoords(combinedCoords[0], c[c.length - 1]));

        if (newSegment) {
          combinedCoords = newSegment.slice(0, -1).concat(combinedCoords);
          coords.splice(coords.indexOf(newSegment), 1);
          continue;
        }

        newSegment = coords.find(c => compareCoords(combinedCoords[combinedCoords.length - 1], c[0]));

        if (newSegment) {
          combinedCoords = combinedCoords.concat(newSegment.slice(1));
          coords.splice(coords.indexOf(newSegment), 1);
          continue;
        }

        newSegment = coords.find(c => compareCoords(combinedCoords[combinedCoords.length - 1], c[c.length - 1]));

        if (newSegment) {
          combinedCoords = combinedCoords.concat(newSegment.reverse().slice(1));
          coords.splice(coords.indexOf(newSegment), 1);
          continue;
        }

        const newFeature = clonedeep(feature);
        newFeature.geometry.coordinates = combinedCoords;
        delete newFeature.properties.distance;
        delete newFeature.properties.objectid;
        features.push(newFeature);

        combinedCoords = coords.pop();
      }

      if (combinedCoords) {
        const newFeature = clonedeep(feature);
        newFeature.geometry.coordinates = combinedCoords;
        delete newFeature.properties.distance;
        delete newFeature.properties.objectid;
        features.push(newFeature);
      }

      return features;
  }, [])
}, null, 2));
