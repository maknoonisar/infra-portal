mapboxgl.accessToken = "pk.eyJ1IjoiZW5ncmtpIiwiYSI6ImNrc29yeHB2aDBieDEydXFoY240bXExcWoifQ.WS7GVtVGZb4xgHn9dleszQ";

let currentPopup = null; // Global variable to store the current popup
const targetCoordinate = [70.447303, 30.753574];

const map = new mapboxgl.Map({
  container: "map",
  projection: 'globe',
  zoom: 4.8,
  center: targetCoordinate,
  pitch: 0,
  bearing: 0,
  antialias: true,
  style: "mapbox://styles/mapbox/satellite-streets-v12"
});

// Create a popup
var popup = new mapboxgl.Popup({
  closeButton: true,
  closeOnClick: false
})
.setHTML('<h3>Fixed Popup</h3><p>This popup will always appear at a fixed position.</p>')
.addTo(map);

// Add event listener to place the popup at a fixed position every time it's opened
popup.on('open', function() {
  var popupEl = document.querySelector('.mapboxgl-popup');
  if (popupEl) {
      // Set fixed position
      popupEl.style.position = 'absolute';
      popupEl.style.top = '35px';   // Adjust the value as needed
      popupEl.style.left = '35px'; // Adjust the value as needed
      popupEl.style.transform = 'none'; // Prevent default Mapbox positioning
  }
});






map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.ScaleControl());
map.addControl(new mapboxgl.FullscreenControl());

map.on("style.load", () => {
  map.setFog({});
  map.addSource("mapbox-dem", {
    type: "raster-dem",
    url: "mapbox://mapbox.mapbox-terrain-dem-v1",
    tileSize: 512,
    maxzoom: 14
  });
  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

  // Load the national boundary geojson
  map.on("load", () => {
    map.addSource('national-boundary', {
      type: 'geojson',
      data: 'data/boundry/National_Boundary.geojson'
    });

    map.addLayer({
      id: 'national-boundary-layer',
      type: 'line',
      source: 'national-boundary',
      layout: {},
      paint: {
        'line-color': 'black',
        'line-width': 3
      }
    });
  });
});






const layers = {
  'ICT': 'data/damages/ict.geojson',
  'Sindh': 'data/damages/SINDH.geojson',
  'Balochistan': 'data/damages/balochistan.geojson',
  'KPK': 'data/damages/KPK.geojson',
  'Gilgit Baltistan': 'data/damages/gilgit.geojson',
  'Ajk': './data/damages/Ajk.geojson',
  'Punjab': 'data/damages/Punjab.geojson',
};

const mediaSections = {
  'Sindh': 'media-sindh',
  'Balochistan': 'media-balochistan',
  'KPK': 'media-kp',
  'Gilgit Baltistan': 'media-gilgit',
  'Ajk': 'media-Ajk',
  'Punjab': 'media-punjab',
};

const recommendationSections = {
  'Sindh': 'recommendation-sindh',
  'Balochistan': 'recommendation-balochistan',
  'KPK': 'recommendation-kp',
  'Gilgit Baltistan': 'recommendation-gilgit',
  'Ajk': 'recommendation-Ajk',
  'Punjab': 'recommendation-punjab'
};



function toggleLayer(layerId, isVisible) {
  const provinceLayerId = layerId;
  const districtLayerId = `${layerId}_Districts`;

  if (isVisible) {
    // Add province-level layer
    if (!map.getSource(provinceLayerId)) {
      map.addSource(provinceLayerId, {
        type: 'geojson',
        data: layers[provinceLayerId]
      });
      map.addLayer({
        id: `${provinceLayerId}-layer`,
        type: 'fill',
        source: provinceLayerId,
        layout: {},
        paint: {
          'fill-color': 'red',
          'fill-opacity': 0.6
        }
      });
    }

    // Add district-level layer
    if (layers[districtLayerId] && !map.getSource(districtLayerId)) {
      map.addSource(districtLayerId, {
        type: 'geojson',
        data: layers[districtLayerId]
      });
      map.addLayer({
        id: `${districtLayerId}-layer`,
        type: 'circle',
        source: districtLayerId,
        layout: {},
        paint: {
          'circle-radius': 7,
          'circle-color': 'blue',
          'circle-opacity': 0.8
        }
      });
    }

    // Show popups and media/recommendation sections
    showPopup(provinceLayerId);
    toggleMediaSection(layerId, true);
    // toggleRecommendationSection(layerId, true);

  } else {
    // Remove province-level layer
    if (map.getLayer(`${provinceLayerId}-layer`)) {
      map.removeLayer(`${provinceLayerId}-layer`);
    }
    if (map.getSource(provinceLayerId)) {
      map.removeSource(provinceLayerId);
    }

    // Remove district-level layer
    if (map.getLayer(`${districtLayerId}-layer`)) {
      map.removeLayer(`${districtLayerId}-layer`);
    }
    if (map.getSource(districtLayerId)) {
      map.removeSource(districtLayerId);
    }

    // Hide popups and media/recommendation sections
    hidePopup();
    toggleMediaSection(layerId, false);
    // toggleRecommendationSection(layerId, false);
  }
}

function showPopup(layerId) {
  fetch(layers[layerId])
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => { // Move the data handling inside this .then block
      if (data.features.length > 0) {
        const feature = data.features[0];
        const coordinates = feature.geometry.coordinates.flat(3);

        console.log('Coordinates:', coordinates); // Log the coordinates to check if they are valid

        const title = feature.properties.Event_Titl || 'No Title';
        const details = feature.properties.Event_Deta || 'No Details';
        const noOfHouses = feature.properties.No_Of_Hous || 'N/A';
        const noOfHo1 = feature.properties.No_of_Ho_1 || 'N/A';
        const noOfBridges = feature.properties.No_of_Brid || 'N/A';
        const lengthOf = feature.properties.Length_of || 'N/A';
        const schools = feature.properties.schools || 'N/A';
        const schools_par = feature.properties.schools_par || 'N/A';

        if (coordinates.length >= 2) {
          const [lng, lat] = coordinates;

          if (currentPopup) {
            currentPopup.remove();
          }

          currentPopup = new mapboxgl.Popup()
            .setLngLat([lng, lat])
            .setHTML(`
              <h3>${title}</h3>
              <p><strong>Details:</strong> ${details}</p>
              <p><strong>No Of House Fully Damaged:</strong> <u>${noOfHouses}</u></p>
              <p><strong>No of House Partially Damaged:</strong> <u>${noOfHo1}</u></p>
              <p><strong>No of Bridges Damaged:</strong> <u>${noOfBridges}</u></p>
              <p><strong>Length of Road Damage (km):</strong> <u>${lengthOf}</u></p>
              <p><strong>Fully Damage Schools:</strong> <u>${schools}</u></p>
              <p><strong>Partially Damage Schools:</strong> <u>${schools_par}</u></p>
            `)
            .addTo(map);
        } else {
          console.error('Invalid coordinates:', coordinates); // Log if the coordinates are invalid
        }
      } else {
        console.error('No features found in the GeoJSON data.');
      }
    })
    .catch(error => console.error("Error loading GeoJSON data:", error));
}


function hidePopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}

function toggleMediaSection(layerId, isVisible) {
  console.log("Toggling media section for:", layerId, "Visible:", isVisible);
  Object.values(mediaSections).forEach(sectionId => {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.style.display = 'none';
    } else {
      console.warn("Element not found:", sectionId);
    }
  });

  if (isVisible && mediaSections[layerId]) {
    const mediaElement = document.getElementById(mediaSections[layerId]);
    if (mediaElement) {
      mediaElement.style.display = 'block';
    } else {
      console.warn("Element not found:", mediaSections[layerId]);
    }
  }
}


document.querySelectorAll('.form-check-input').forEach(checkbox => {
  checkbox.addEventListener('change', function() {
    const layerId = this.nextElementSibling.innerText.trim();
    toggleLayer(layerId, this.checked);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('.enlargeable');
  const overlay = document.getElementById('overlay');

  images.forEach(img => {
    img.addEventListener('click', () => {
      const enlargedImage = document.querySelector('.overlay img');
      if (enlargedImage) {
        enlargedImage.remove();
      }

      const newImage = document.createElement('img');
      newImage.src = img.src;
      newImage.classList.add('enlarged');
      overlay.appendChild(newImage);

      overlay.style.display = 'flex';

      overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
      });
    });
  });
});



























const provinces = {
  punjab: {
    switchId: 'flexSwitchCheckDefaultPunjab',
    navContainerId: 'punjabNavContainer',
    layers: {
      houses: 'punjabHousesLayer',
      bridges: 'punjabBridgesLayer',
      roads: 'punjabRoadsLayer',
      communication: 'punjabCommunicationLayer',  // Added communication layer
      polygon: 'punjabPolygonLayer'
    },
    geojsons: {
      houses: 'points/Punjab/Residential/residential_damages.geojson',
      bridges: '',
      roads: 'points/Punjab/Comm/communication_damages.geojson',
      communication: 'points/Punjab/Comm/communication_damages.geojson',  // Added communication geojson
      polygon: 'data/damages/Punjab.geojson'
    }
  },
  sindh: {
    switchId: 'flexSwitchCheckDefaultSindh',
    navContainerId: 'sindhNavContainer',
    layers: {
      houses: 'sindhHousesLayer',
      bridges: 'sindhBridgesLayer',
      roads: 'sindhRoadsLayer',
      communication: 'sindhCommunicationLayer',  // Added communication layer
      polygon: 'sindhPolygonLayer'
    },
    geojsons: {
      houses: 'points/Sindh/residential.geojson',
      bridges: 'points/Sindh/bridges-roads.geojson',
      roads: 'path/to/your/sindh-roads.geojson',
      communication: 'points/Sindh/communication.geojson',  // Added communication geojson
      polygon: 'data/damages/SINDH.geojson'
    }
  },
  balochistan: {
    switchId: 'flexSwitchCheckDefaultBalochistan',
    navContainerId: 'balochistanNavContainer',
    layers: {
      houses: 'balochistanHousesLayer',
      bridges: 'balochistanBridgesLayer',
      roads: 'balochistanRoadsLayer',
      communication: 'balochistanCommunicationLayer',  // Added communication layer
      polygon: 'balochistanPolygonLayer'
    },
    geojsons: {
      houses: 'points/balochistan/houses.geojson',
      bridges: 'points/balochistan/bridges.geojson',
      roads: 'points/balochistan/roads.geojson',
      communication: 'points/balochistan/communication.geojson',  // Added communication geojson
      polygon: 'data/damages/balochistan.geojson'
    }
  },
  kpk: {
    switchId: 'flexSwitchCheckDefaultKpk',
    navContainerId: 'kpkNavContainer',
    layers: {
      houses: 'kpkHousesLayer',
      bridges: 'kpkBridgesLayer',
      roads: 'kpkRoadsLayer',
      communication: 'kpkCommunicationLayer',  // Added communication layer
      polygon: 'kpkPolygonLayer'
    },
    geojsons: {
      houses: 'points/kpk/houses.geojson',
      bridges: 'points/kpk/bridges.geojson',
      roads: 'path/to/your/kpk-roads.geojson',
      communication: 'points/kpk/communication.geojson',  // Added communication geojson
      polygon: 'data/damages/KPK.geojson'
    }
  },
  gb: {
    switchId: 'flexSwitchCheckDefaultGb',
    navContainerId: 'gbNavContainer',
    layers: {
      houses: 'gbHousesLayer',
      bridges: 'gbBridgesLayer',
      roads: 'gbRoadsLayer',
      communication: 'gbCommunicationLayer',  // Added communication layer
      polygon: 'gbPolygonLayer'
    },
    geojsons: {
      houses: 'points/GB/Residential/Houses Damaged.geojson',
      bridges: 'points/GB/Bridges/Bridges.geojson',
      roads: 'path/to/your/gb-roads.geojson',
      communication: 'points/GB/Comm/Communication.geojson',  // Added communication geojson
      polygon: 'data/damages/gilgit.geojson'
    }
  },
  Ajk: {
    switchId: 'flexSwitchCheckDefaultAjk',
    navContainerId: 'AjkNavContainer',
    layers: {
      houses: 'AjkHousesLayer',
      bridges: 'AjkBridgesLayer',
      roads: 'AjkRoadsLayer',
      communication: 'AjkCommunicationLayer',  // Added communication layer
      polygon: 'AjkPolygonLayer'
    },
    geojsons: {
      houses: 'points/Azadkashmir/Residential/residential_Ajk.geojson',
      bridges: 'points/Azadkashmir/Comm/Communication.geojson',
      roads: 'path/to/your/Ajk-roads.geojson',
      communication: 'points/Ajk/Comm/Communication.geojson',  // Added communication geojson
      polygon: 'data/damages/Ajk.geojson'
    }
  },
  ict: {
    switchId: 'flexSwitchCheckDefaultIct',
    navContainerId: 'ictNavContainer',
    layers: {
      houses: 'ictHousesLayer',
      bridges: 'ictBridgesLayer',
      roads: 'ictRoadsLayer',
      communication: 'ictCommunicationLayer',  // Added communication layer
      polygon: 'ictPolygonLayer'
    },
    geojsons: {
      houses: 'path/to/your/ict-houses.geojson',
      bridges: 'path/to/your/ict-bridges.geojson',
      roads: 'path/to/your/ict-roads.geojson',
      communication: 'path/to/your/ict-communication.geojson',  // Added communication geojson
      polygon: 'data/damages/ict.geojson'
    }
  }
};



map.on('load', function () {
  // Add images (for houses, bridges, roads icons)
  const icons = {
    'house-icon': 'icons/home.png',
    'bridge-icon': 'icons/bridges.png',
    'road-icon': 'icons/roads.jpg',
    'communication-icon': 'icons/communication.jpg'
  };

  Object.keys(icons).forEach(iconName => {
    map.loadImage(icons[iconName], (error, image) => {
      if (error) throw error;
      map.addImage(iconName, image);
    });
  });

  // Add geojson layers (houses, bridges, roads, polygons)
  Object.keys(provinces).forEach(province => {
    const { layers, geojsons } = provinces[province];
    Object.keys(layers).forEach(type => {
      map.addSource(`${province}-${type}`, {
        type: 'geojson',
        data: geojsons[type]
      });

      let layoutProperties = {};
      if (type === 'houses') {
        layoutProperties = {
          'icon-image': 'house-icon',
          'icon-size': 0.1,
          'icon-allow-overlap': true
        };
      } else if (type === 'bridges') {
        layoutProperties = {
          'icon-image': 'bridge-icon',
          'icon-size': 0.1,
          'icon-allow-overlap': true
        };
      } else if (type === 'roads') {
        layoutProperties = {
          'icon-image': 'road-icon',
          'icon-size': 0.1,
          'icon-allow-overlap': true
        };
    } else if (type === 'communication') {
      layoutProperties = {
        'icon-image': 'communication-icon', // Add your specific communication icon here
        'icon-size': 0.1, // Adjust size as needed
        'icon-allow-overlap': true
      };
    }

      // Add the layer for points
      map.addLayer({
        id: layers[type],
        type: 'symbol',
        source: `${province}-${type}`,
        layout: {
          ...layoutProperties,
          'visibility': 'none' // Initially hidden
        }
      });

      // Event listener for displaying dynamic popups
      if (type === 'houses' || type === 'bridges' || type === 'roads') {
        map.on('click', layers[type], function (e) {
          const coordinates = e.features[0].geometry.coordinates.slice();
          const properties = e.features[0].properties;

          // Create and add a dynamic popup
          new mapboxgl.Popup({ className: 'dynamic-popup' })
            .setLngLat(coordinates)
            // .setHTML(`<strong>${type}</strong><br>Details: ${JSON.stringify(properties)}`)
            .setHTML(`<strong>${type}</strong><br>Details: <pre>${JSON.stringify(properties, null, 2)}</pre>`)

            .addTo(map);
        });
      }

      // Click event for polygons (if needed)
      if (type === 'polygon') {
        map.on('click', layers[type], function (e) {
          const feature = e.features[0];
          updateTableWithPolygonData(feature);
        });
      }
    });
  });


});






// Add functionality to control province visibility
function toggleProvince(province) {
  const { layers } = provinces[province];
  Object.keys(layers).forEach(type => {
    const layerId = `${province}-${type}`;
    const visibility = map.getLayoutProperty(layerId, 'visibility');

    // Toggle visibility for layers of the selected province
    if (visibility === 'visible') {
      map.setLayoutProperty(layerId, 'visibility', 'none');
    } else {
      map.setLayoutProperty(layerId, 'visibility', 'visible');
    }
  });

  // Zoom to the selected province's polygon bounds
  map.fitBounds(getBoundsForProvince(province), {
    padding: 20
  });
}

// Helper function to get the bounds of a province
function getBoundsForProvince(province) {
  const geojson = provinces[province].geojsons.polygon;  // Assuming each province has a polygon geojson
  const coordinates = geojson.features[0].geometry.coordinates;
  const bounds = new mapboxgl.LngLatBounds();
  coordinates[0].forEach(coord => bounds.extend(coord));
  return bounds;
}

document.addEventListener('DOMContentLoaded', function () {
  Object.keys(provinces).forEach(provinceKey => {
    const { switchId, navContainerId, layers } = provinces[provinceKey];
    const provinceSwitch = document.getElementById(switchId);

    // Toggle the visibility of polygon layer when the switch is toggled
    provinceSwitch.addEventListener('change', function () {
      const visibility = provinceSwitch.checked ? 'visible' : 'none';
      // Set polygon layer visibility
      map.setLayoutProperty(layers.polygon, 'visibility', visibility);

      // Show or hide the corresponding nav-container
      const navContainer = document.getElementById(navContainerId);
      navContainer.style.display = provinceSwitch.checked ? 'block' : 'none';
      
      // Hide info panel if polygon layer is hidden
      if (visibility === 'none') {
        document.getElementById('info-panel').style.display = 'none';
      }
    });

    // Handle nav-items for individual layer toggle
    const navContainer = document.getElementById(navContainerId);
    if (navContainer) {
      navContainer.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
          const layerId = this.getAttribute('data-layer');
          const currentVisibility = map.getLayoutProperty(layerId, 'visibility');
          
          if (currentVisibility === 'visible') {
            // Hide the selected layer
            map.setLayoutProperty(layerId, 'visibility', 'none');
          } else {
            // Hide all point layers
            Object.keys(layers).forEach(type => {
              if (type !== 'polygon') {
                map.setLayoutProperty(layers[type], 'visibility', 'none');
              }
            });

            // Show the selected layer
            map.setLayoutProperty(layerId, 'visibility', 'visible');
          }
        });
      });
    }
  });
});








