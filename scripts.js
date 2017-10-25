// VARIABLES
// ID of HTML element that wraps everything we need in the UI
const mapWrap = 'map-wrap';

// ID of HTML element to hold the map
const myMap = 'map-canvas';

// ID of HTML element to hold the list of markers
const landmarkListWrapper = 'landmark-listing';

// Get handle to reset button
const resetBtn = document.getElementById('reset');

// Class name to mark elements as active
const activeClass = 'active';

// Google Maps API Key
// const apiKey = 'AIzaSyCmKBQVwmgMV8kVij7qqOiBQNsJIbA5qwc'; Localhost
const apiKey = 'AIzaSyDQShvmZn5OfDXv8eoOi--sdXsCsCHXaeQ';

// Paths to JSON data
const markersFeed =
	'https://www.4000massaveapts.net/dev/wp-json/wp/v2/area_landmarks?per_page=100';
const catsFeed =
	'https://www.4000massaveapts.net/dev/wp-json/wp/v2/landmark_types';

// Specify whether you want to add a static community marker to the map (true/false).
const addCommMarker = false;
const locationOptionsFeed =
	'https://www.4000massaveapts.net/dev/wp-json/acf/v2/options';

// Set the path to the icons in your theme
const iconPath = '/dev/wp-content/themes/four-thousand-mass/imgs/';

// For later use
let map, commMarker, bounds, infowindow, landmarksObj, catsObj;
const markers = [];
const locations = [];

// Check to see if there is an HTML element on our page to load the map into
// If there is, call the Google Maps API with our API key and a callback function
document.addEventListener('DOMContentLoaded', function() {
	if (document.getElementById(myMap)) {
		let lang = '';
		if (document.querySelector('html').lang) {
			lang = document.querySelector('html').lang;
		} else {
			lang = 'en';
		}

		const mapJsFile = document.createElement('script');
		mapJsFile.type = 'text/javascript';
		mapJsFile.src =
			'https://maps.googleapis.com/maps/api/js?callback=fetchData&language=' +
			lang;
		document.getElementsByTagName('body')[0].appendChild(mapJsFile);
	}
});

// Fetch all of the data we will use
function fetchData() {
	document.getElementById(myMap).innerHTML = 'Loading map...';

	const xhrMarkers = new XMLHttpRequest();
	xhrMarkers.onreadystatechange = function() {
		if (xhrMarkers.readyState === 4 && xhrMarkers.status === 200) {
			const data = JSON.parse(xhrMarkers.responseText);
			landmarksObj = data;
			convertLandmarkData(landmarksObj);
		}
	};

	xhrMarkers.open('GET', markersFeed, true);
	xhrMarkers.send();

	const xhrCats = new XMLHttpRequest();
	xhrCats.onreadystatechange = function() {
		if (xhrCats.readyState === 4 && xhrCats.status === 200) {
			const data = JSON.parse(xhrCats.responseText);
			catsObj = data;
			buildCats(catsObj);
		}
	};

	xhrCats.open('GET', catsFeed, true);
	xhrCats.send();
}

// Create an array of nested arrays with the pieces of data we will need
function convertLandmarkData(arr) {
	for (let i = 0; i < arr.length; i++) {
		let title = arr[i].title.rendered;
		let add = arr[i].acf.address;
		let add2 = arr[i].acf.address_2;
		let phone = arr[i].acf.phone;
		let website = arr[i].acf.website;
		let details = arr[i].acf.additional_details;
		let latitude = arr[i].acf.latitude;
		let longitude = arr[i].acf.longitude;
		let category = 'cat-' + arr[i].landmark_types[0];

		locations.push([
			i,
			title,
			latitude,
			longitude,
			add,
			add2,
			phone,
			website,
			details,
			category
		]);

		if (i === arr.length - 1) {
			buildMap(locations, locationOptionsFeed);
		}
	}
}

// Build our map and our list of landmarks
function buildMap(data, location) {
	//console.log('Loactions array', data);
	bounds = new google.maps.LatLngBounds();
	infowindow = new google.maps.InfoWindow();

	// If "addCommMarker" is true, add a static marker to the map for our community
	function addCommunityMarker(lat, lng) {
		commMarker = new google.maps.Marker({
			position: { lat: lat, lng: lng },
			map: map,
			zIndex: 1000
			//icon: iconPath + 'static-comm-marker.png'
		});
	}

	if (addCommMarker) {
		fetch(location)
			.then(response => response.json())
			.then(function(data) {
				const lat = Number(data.acf.latitude);
				const lng = Number(data.acf.longitude);
				addCommunityMarker(lat, lng);
			});
	}

	// Style the map
	const mapStyles = [
		{
			featureType: 'poi',
			elementType: 'labels',
			stylers: [
				{
					visibility: 'off'
				}
			]
		},
		{
			featureType: 'transit',
			elementType: 'labels',
			stylers: [
				{
					visibility: 'off'
				}
			]
		}
	];

	map = new google.maps.Map(document.getElementById(myMap), {
		mapTypeControl: false,
		scrollwheel: false,
		panControl: false,
		rotateControl: false,
		streetViewControl: false,
		zoomControlOptions: {
			position: google.maps.ControlPosition.RIGHT_BOTTOM
		},
		styles: mapStyles
	});

	const landmarksList = document.createElement('ul');
	document.getElementById(landmarkListWrapper).appendChild(landmarksList);

	// Loop through our data and create map markers and list items
	for (let i = 0; i < data.length; i++) {
		const listItem = document.createElement('li');
		listItem.classList.add(data[i][9]);
		listItem.classList.add(activeClass);
		listItem.innerHTML = data[i][1];
		landmarksList.appendChild(listItem);
		listItem.addEventListener('click', function() {
			google.maps.event.trigger(markers[i], 'click');
		});

		//let image = iconPath + locations[i][9] + '.png';
		let marker = new google.maps.Marker({
			position: new google.maps.LatLng(data[i][2], data[i][3]),
			map: map,
			//icon: image,
			html: `<strong class="heading">${data[i][1]}</strong>${data[i][4]}${data[
				i
			][5]}${data[i][6]}${data[i][7]}${data[i][8]}`
		});
		markers.push(marker);
		bounds.extend(marker.getPosition());

		// See http://jsfiddle.net/upsidown/8gjt0y6p/
		google.maps.event.addListener(
			marker,
			'click',
			(function(marker) {
				return function() {
					infowindow.setContent(marker.html);
					infowindow.open(map, marker);
				};
			})(marker, i)
		);
	}

	//console.log('Markers array', markers);
	map.fitBounds(bounds);
}

// Build the category navigation
const catNav = document.createElement('nav');
function buildCats(data) {
	//console.log('Categories array', data);
	catNav.id = 'map-nav';
	document.getElementById(mapWrap).appendChild(catNav);
	const catNavUl = document.createElement('ul');
	catNav.appendChild(catNavUl);

	for (let i = 0; i < data.length; i++) {
		if (data[i].count > 0) {
			const listItem = document.createElement('li');
			listItem.id = 'cat-' + data[i].id;
			listItem.classList.add(data[i].slug);

			const listItemHref = document.createElement('a');
			listItemHref.classList.add(activeClass);
			listItemHref.href = '#';
			listItemHref.innerHTML = data[i].name;
			listItem.appendChild(listItemHref);
			catNavUl.appendChild(listItem);

			catClick(listItemHref, catNavUl);
		}
	}

	// View/hide markers on the map and swap active class on category nav
	function catClick(href, ul) {
		href.addEventListener('click', function(event) {
			event.preventDefault();
			if (infowindow) {
				infowindow.close();
			}

			const cat = this.parentElement.getAttribute('id');

			// Set visibility for markers on the map
			for (let i = 0; i < locations.length; i++) {
				if (locations[i][9] === cat) {
					markers[i].setVisible(true);
					markers[i].setOptions({ zIndex: 1100 });
				} else if (locations[i][9] !== cat) {
					markers[i].setVisible(false);
				}
			}

			// Set visibility for markers in the list
			const listItems = Array.from(
				document.querySelectorAll(`#${landmarkListWrapper} li`)
			);
			for (let i = 0; i < listItems.length; i++) {
				listItems[i].classList.remove('active');
				if (listItems[i].classList.contains(cat)) {
					listItems[i].classList.add(activeClass);
				}
			}

			// Set active class for category nav
			let children = [];
			children = ul.children;
			for (let i = 0; i < children.length; i++) {
				children[i].firstChild.classList.remove(activeClass);
			}
			this.classList.add(activeClass);

			// Set active class for reset button
			resetBtn.classList.add(activeClass);
		});
	}
}

// Reset Controls
function resetMap(map, btn) {
	// Reset map
	for (let i = 0; i < locations.length; i++) {
		markers[i].setVisible(true);
	}
	if (infowindow) {
		infowindow.close();
	}
	map.fitBounds(bounds);

	// Reset cat nav
	const mapNavItems = catNav.children[0].childNodes;
	for (let i = 0; i < mapNavItems.length; i++) {
		mapNavItems[i].firstChild.classList.add('active');
	}

	// Reset list of markers
	const listItems = Array.from(
		document.querySelectorAll(`#${landmarkListWrapper} li`)
	);
	for (let i = 0; i < listItems.length; i++) {
		listItems[i].classList.add(activeClass);
	}

	// Hide reset button
	btn.classList.remove('active');
}

resetBtn.addEventListener('click', function() {
	resetMap(map, this);
});
