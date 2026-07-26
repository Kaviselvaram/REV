// Mock data shaped exactly like the future backend schema, split into two
// parallel mode bundles (bike / car). Swap this module for API calls later.

export const CITY = 'Chennai'

export const ACCENTS = { bike: '#A64B2A', car: '#33627A' }

// Launch cities — Chennai first, the rest as the community spreads.
export const CITIES = [
  'Chennai', 'Bengaluru', 'Hyderabad', 'Coimbatore', 'Madurai',
  'Kochi', 'Pune', 'Mumbai', 'Delhi NCR', 'Kolkata',
]

// Prototype only: numbers already "registered", so the login kit can show both
// paths — a returning member signs straight in, any other number is sent
// through account creation. The real backend answers this from the profiles
// table after the OTP is verified.
export const KNOWN_MEMBERS = {
  '9876543210': { name: 'Kavi Selvaram', handle: 'kavi', city: 'Chennai' },
}

// Photography library. Six user-supplied hero frames (asset*) plus a curated
// set of free, high-resolution stock (Pexels, no attribution required) so no
// image repeats across the site. All in public/img/.
export const IMG = {
  // — user originals —
  redCar: '/img/asset1.jpg',      // red classic in golden grass
  bike: '/img/asset2.jpg',        // maroon classic motorcycle on grass
  twoClassics: '/img/asset3.jpg', // two classics under the canopy
  fogRoad: '/img/asset4.jpg',     // silver coupé on a foggy forest road
  interior: '/img/asset5.jpg',    // modern luxury cabin, man at door
  wheelBW: '/img/asset6.jpg',     // vintage Mustang wheel, black & white

  // — curated stock: motorcycles —
  bikeWarm: '/img/stock-bike-warm.jpg',       // Royal Enfield, warm autumn bokeh
  bikeOutdoor: '/img/stock-bike-outdoor.jpg', // classic RE parked, greenery
  bikeTank: '/img/stock-bike-tank.jpg',       // tank + tooling detail
  bikeSunset: '/img/stock-bike-sunset.jpg',   // rider silhouette into golden sun
  bikeDesert: '/img/stock-bike-desert.jpg',   // lone bike, mountain road
  bikeHighway: '/img/stock-bike-highway.jpg', // adventure bike, open highway
  bikeLogo: '/img/stock-bike-logo.jpg',       // tank badge macro

  // — cinematic hero video loops + poster frames —
  vidMoto: '/img/clip-moto.mp4',
  vidMotoPoster: '/img/poster-moto.jpg',
  vidRoad: '/img/clip-road.mp4',
  vidRoadPoster: '/img/poster-road.jpg',
  // aerial forest-road drone shot (user-supplied) — the four-wheeler hero
  vidDrive: '/img/hero-drive.mp4',
  vidDrivePoster: '/img/poster-drive.jpg',
  // scroll-scrub frame sequences (drawn to canvas — never stalls, full clarity)
  seqBike: { dir: '/img/seq-bike/', count: 52 },
  seqCar: { dir: '/img/seq-car/', count: 44 },

  // — curated stock: cars —
  carFogMtn: '/img/stock-car-fog-mtn.jpg',    // coupé, misty lake + peaks
  carMtnRoad: '/img/stock-car-mtn-road.jpg',  // aerial autumn switchback
  forestRoad: '/img/stock-forest-road.jpg',   // lone car on redwood road
  chromeDetail: '/img/stock-chrome-detail.jpg', // vintage chrome + reflection
  grilleDark: '/img/stock-grille-dark.jpg',   // BMW E30 grille, low key
  dashLeather: '/img/stock-dash-leather.jpg', // luxury dash, stitched leather
  headlightLux: '/img/stock-headlight-lux.jpg', // modern headlight detail
  interiorWarm: '/img/stock-interior-warm.jpg', // vintage cabin, tan leather
}

// The signed-in mock user (owner of the Garage screen) — same human in both modes.
export const currentUser = {
  id: 'me',
  name: 'Kavi Selvaram',
  avatarUrl: null,
  verified: true,
  ridesCount: 12,
  joinedDate: '2026-03-02',
}

/* ================================================================
   TWO-WHEELER WORLD
   ================================================================ */

const bikeRiders = [
  { id: 'r1',  name: 'Arjun Prakash',    avatarUrl: null, verified: true,  ridesCount: 47, joinedDate: '2025-08-14' },
  { id: 'r2',  name: 'Divya Nair',       avatarUrl: null, verified: true,  ridesCount: 62, joinedDate: '2025-06-02' },
  { id: 'r3',  name: 'Karthik Subramani', avatarUrl: null, verified: true, ridesCount: 88, joinedDate: '2025-05-20' },
  { id: 'r4',  name: 'Meera Krishnan',   avatarUrl: null, verified: true,  ridesCount: 31, joinedDate: '2025-09-01' },
  { id: 'r5',  name: 'Vikram Rao',       avatarUrl: null, verified: false, ridesCount: 6,  joinedDate: '2026-04-18' },
  { id: 'r6',  name: 'Sanjay Menon',     avatarUrl: null, verified: true,  ridesCount: 54, joinedDate: '2025-07-11' },
  { id: 'r7',  name: 'Priya Venkatesh',  avatarUrl: null, verified: true,  ridesCount: 40, joinedDate: '2025-10-05' },
  { id: 'r8',  name: 'Ashwin Kumar',     avatarUrl: null, verified: false, ridesCount: 3,  joinedDate: '2026-05-30' },
  { id: 'r9',  name: 'Lakshmi Raghavan', avatarUrl: null, verified: true,  ridesCount: 72, joinedDate: '2025-04-22' },
  { id: 'r10', name: 'Rahul Chandran',   avatarUrl: null, verified: true,  ridesCount: 25, joinedDate: '2025-11-19' },
  { id: 'r11', name: 'Ananya Iyer',      avatarUrl: null, verified: true,  ridesCount: 36, joinedDate: '2025-09-28' },
  { id: 'r12', name: 'Suresh Balaji',    avatarUrl: null, verified: false, ridesCount: 9,  joinedDate: '2026-02-14' },
  { id: 'r13', name: 'Nithya Shankar',   avatarUrl: null, verified: true,  ridesCount: 58, joinedDate: '2025-06-25' },
  { id: 'r14', name: 'Aditya Varma',     avatarUrl: null, verified: true,  ridesCount: 19, joinedDate: '2026-01-08' },
  { id: 'r15', name: 'Kavya Ramesh',     avatarUrl: null, verified: true,  ridesCount: 44, joinedDate: '2025-08-30' },
]

const bikeVehicles = [
  { id: 'v1', riderId: 'r1',  make: 'Royal Enfield', model: 'Himalayan 450', year: 2024, mods: ['Rally footpegs', 'Aux LED pods'], photos: [], rideStyle: 'Adventure / Touring' },
  { id: 'v2', riderId: 'r2',  make: 'KTM',           model: 'Duke 390',      year: 2023, mods: ['Akrapovič slip-on', 'Frame sliders'], photos: [], rideStyle: 'Street / Twisties' },
  { id: 'v3', riderId: 'r3',  make: 'Royal Enfield', model: 'Interceptor 650', year: 2022, mods: ['Café fairing', 'Bar-end mirrors', 'Retuned suspension'], photos: [], rideStyle: 'Highway Cruiser' },
  { id: 'v4', riderId: 'r4',  make: 'Triumph',       model: 'Speed 400',     year: 2024, mods: ['Tail tidy'], photos: [], rideStyle: 'Street / Twisties' },
  { id: 'v5', riderId: 'r6',  make: 'Bajaj',         model: 'Dominar 400',   year: 2021, mods: ['Touring windscreen', 'Saddle stays', 'Crash guard'], photos: [], rideStyle: 'Long-Distance Touring' },
  { id: 'v6', riderId: 'r7',  make: 'Honda',         model: "CB350 H'ness",  year: 2023, mods: [], photos: [], rideStyle: 'Sunday Breakfast Runs' },
  { id: 'v7', riderId: 'r9',  make: 'Royal Enfield', model: 'Continental GT 650', year: 2023, mods: ['Clip-ons', 'S&S exhaust'], photos: [], rideStyle: 'Café Racer' },
  { id: 'v8', riderId: 'r13', make: 'Yamaha',        model: 'MT-15 V2',      year: 2024, mods: ['Radiator guard'], photos: [], rideStyle: 'City + Track Days' },
]

const bikeRides = [
  {
    id: 'ride1',
    title: 'ECR Sunrise Run to Mahabalipuram',
    captainId: 'r3',
    dateTime: '2026-07-26T05:30:00+05:30',
    meetupPin: { lat: 12.9915, lng: 80.2337, label: 'Thiruvanmiyur RTO Junction' },
    route: 'Thiruvanmiyur → ECR → Kovalam Bridge → Mahabalipuram Shore Temple. Coastal tarmac all the way, one fuel stop at Akkarai.',
    safetyNotes: 'Full riding gear mandatory — helmet, gloves, shoes minimum. We ride in staggered formation, no overtaking the lead. Speed capped at 80 km/h on ECR. Sweep rider carries a first-aid kit.',
    attendees: ['r3', 'r1', 'r2', 'r7', 'r9', 'r11', 'r13', 'r15', 'r5'],
    capacity: 14,
    status: 'upcoming',
    distanceKm: 58,
  },
  {
    id: 'ride2',
    title: 'Night Owls: GST Road Midnight Loop',
    captainId: 'r2',
    dateTime: '2026-07-19T23:00:00+05:30',
    meetupPin: { lat: 12.9789, lng: 80.2005, label: 'Phoenix MarketCity, Velachery' },
    route: 'Velachery → GST Road → Chengalpattu bypass → back via Vandalur. Well-lit highway loop, minimal traffic after 11.',
    safetyNotes: 'Hi-viz vests provided by captain. Headlight + taillight check before rollout. No solo splits — we return as one group. Hydration stop at Paranur toll.',
    attendees: ['r2', 'r6', 'r10', 'r14', 'r1'],
    capacity: 10,
    status: 'live',
    distanceKm: 96,
  },
  {
    id: 'ride3',
    title: 'Breakfast Run: Ciclo Café Loop',
    captainId: 'r7',
    dateTime: '2026-07-27T06:45:00+05:30',
    meetupPin: { lat: 13.0067, lng: 80.2206, label: 'Kotturpuram Bridge Parking' },
    route: 'Kotturpuram → OMR service lane → Ciclo Café, Kotivakkam. Short, easy, new-rider friendly.',
    safetyNotes: 'Beginner-friendly pace, 50 km/h cap. Great first ride if you just joined REV. Captain stays at the back with newcomers.',
    attendees: ['r7', 'r4', 'r8', 'r11', 'r15', 'r12'],
    capacity: 12,
    status: 'upcoming',
    distanceKm: 24,
  },
  {
    id: 'ride4',
    title: 'Kolli Hills Weekend Assault — 70 Hairpins',
    captainId: 'r1',
    dateTime: '2026-08-01T04:00:00+05:30',
    meetupPin: { lat: 12.9165, lng: 80.1525, label: 'Tambaram Bypass HP Pump' },
    route: 'Tambaram → NH38 to Salem side → Kolli Hills ghat road, all 70 hairpins → Agaya Gangai viewpoint. Overnight halt at Semmedu.',
    safetyNotes: 'Experienced riders only — minimum 20 logged rides. Knee + elbow armour required for the ghat section. Buddy-pair system on hairpins. RC + DL checked at flag-off.',
    attendees: ['r1', 'r3', 'r6', 'r9', 'r13'],
    capacity: 8,
    status: 'upcoming',
    distanceKm: 380,
  },
  {
    id: 'ride5',
    title: 'Women Riders Collective: Marina Dawn Patrol',
    captainId: 'r9',
    dateTime: '2026-07-25T05:45:00+05:30',
    meetupPin: { lat: 13.0499, lng: 80.2824, label: 'Lighthouse, Marina Beach' },
    route: 'Lighthouse → Kamarajar Salai → Santhome Loop → filter coffee at Mylapore. Women-led, women-only roster.',
    safetyNotes: 'Verified women riders only — enforced by roster. Marshals at front and sweep. Route shared with emergency contacts via the app.',
    attendees: ['r9', 'r2', 'r4', 'r7', 'r11', 'r13', 'r15'],
    capacity: 15,
    status: 'upcoming',
    distanceKm: 18,
  },
  {
    id: 'ride6',
    title: 'Vintage & Classics Show Ride',
    captainId: 'r6',
    dateTime: '2026-08-09T07:00:00+05:30',
    meetupPin: { lat: 13.0837, lng: 80.2702, label: 'Napier Bridge North End' },
    route: 'Napier Bridge lineup + photo run → Fort St. George → Rajaji Salai loop. Slow parade pace for the classics.',
    safetyNotes: 'Parade pace, 40 km/h. Bikes older than 2005 get the front row. Marshals manage junctions — hold formation.',
    attendees: ['r6', 'r3', 'r10', 'r12'],
    capacity: 20,
    status: 'upcoming',
    distanceKm: 12,
  },
  {
    id: 'ride7',
    title: 'Kanchipuram Temple Trail',
    captainId: 'r13',
    dateTime: '2026-08-02T06:00:00+05:30',
    meetupPin: { lat: 12.9250, lng: 80.1000, label: 'Kundrathur Junction' },
    route: 'Kundrathur → Sriperumbudur → Kanchipuram Ekambareswarar Temple → lunch at Saravana Bhavan → return via Walajabad.',
    safetyNotes: 'Mixed-experience ride. Two regroup points. Carry 2L water — August heat on NH4 is real. Temple entry: shoes off, park in the designated lot.',
    attendees: ['r13', 'r5', 'r7', 'r10', 'r11', 'r14', 'r15'],
    capacity: 12,
    status: 'upcoming',
    distanceKm: 148,
  },
  {
    id: 'ride8',
    title: 'Sunset Loop: Muttukadu Backwaters',
    captainId: 'r11',
    dateTime: '2026-07-24T16:30:00+05:30',
    meetupPin: { lat: 12.9611, lng: 80.2432, label: 'Sholinganallur Signal, OMR' },
    route: 'Sholinganallur → Kelambakkam → Muttukadu boat house for sunset → ECR back. Golden-hour photography ride.',
    safetyNotes: 'Return leg is after dark — working headlight and reflective gear checked at start. Photographers: park only in the marked bay.',
    attendees: ['r11', 'r4', 'r8', 'r15'],
    capacity: 10,
    status: 'upcoming',
    distanceKm: 46,
  },
  {
    id: 'ride9',
    title: 'ECR Classic: Pondicherry Day Dash',
    captainId: 'r3',
    dateTime: '2026-07-12T05:00:00+05:30',
    meetupPin: { lat: 12.9915, lng: 80.2337, label: 'Thiruvanmiyur RTO Junction' },
    route: 'Thiruvanmiyur → ECR full stretch → Auroville → White Town breakfast → return by 6 PM. The classic Chennai pilgrimage.',
    safetyNotes: 'Long day in the saddle — 310 km round trip. Fuel + stretch stops every 60 km. Border crossing: carry DL and RC originals.',
    attendees: ['r3', 'r1', 'r2', 'r6', 'r9', 'r10', 'r13', 'r14'],
    capacity: 12,
    status: 'completed',
    distanceKm: 310,
  },
  {
    id: 'ride10',
    title: 'Monsoon Gear Check + Chai Meet',
    captainId: 'r1',
    dateTime: '2026-07-05T17:00:00+05:30',
    meetupPin: { lat: 13.0418, lng: 80.2341, label: 'Anna Nagar Tower Park Gate 2' },
    route: 'Static meet — no ride. Gear inspection tables, tyre-tread checks, rain-kit swap meet, chai on the club.',
    safetyNotes: 'Open to all members including unverified newcomers. Bring your rain gear for a free waterproofing check.',
    attendees: ['r1', 'r4', 'r5', 'r7', 'r8', 'r11', 'r12', 'r14', 'r15'],
    capacity: 30,
    status: 'completed',
    distanceKm: 0,
  },
]

const bikeRecaps = [
  {
    rideId: 'ride9',
    photos: [
      { id: 'p1', caption: 'Rolling out at dawn, Thiruvanmiyur', src: IMG.bike },
      { id: 'p2', caption: 'Formation on the ECR straight', src: IMG.bikeHighway },
      { id: 'p3', caption: 'Fuel halt, warm light', src: IMG.bikeWarm },
      { id: 'p4', caption: 'Tooling detail on the tank', src: IMG.bikeTank },
      { id: 'p5', caption: 'Ghat switchback, km 180', src: IMG.bikeDesert },
      { id: 'p6', caption: 'Sweep rider, into the sun', src: IMG.bikeSunset },
    ],
    statsSummary: { distanceKm: 310, movingTime: '6h 42m', avgSpeedKmh: 46, riders: 8, showUpRate: 100, fuelStops: 4 },
    attendeeIds: ['r3', 'r1', 'r2', 'r6', 'r9', 'r10', 'r13', 'r14'],
  },
  {
    rideId: 'ride10',
    photos: [
      { id: 'p1', caption: 'Line-up at Tower Park', src: IMG.bikeOutdoor },
      { id: 'p2', caption: 'Badge macro', src: IMG.bikeLogo },
      { id: 'p3', caption: 'Chai round two', src: IMG.bikeWarm },
    ],
    statsSummary: { distanceKm: 0, movingTime: '2h 30m', avgSpeedKmh: 0, riders: 9, showUpRate: 90, fuelStops: 0 },
    attendeeIds: ['r1', 'r4', 'r5', 'r7', 'r8', 'r11', 'r12', 'r14', 'r15'],
  },
]

/* ================================================================
   FOUR-WHEELER WORLD
   ================================================================ */

const carDrivers = [
  { id: 'c1',  name: 'Rohan Pillai',      avatarUrl: null, verified: true,  ridesCount: 52, joinedDate: '2025-07-03' },
  { id: 'c2',  name: 'Shruti Raman',      avatarUrl: null, verified: true,  ridesCount: 67, joinedDate: '2025-05-12' },
  { id: 'c3',  name: 'Vishal Narayanan',  avatarUrl: null, verified: true,  ridesCount: 91, joinedDate: '2025-04-30' },
  { id: 'c4',  name: 'Deepika Sundaram',  avatarUrl: null, verified: true,  ridesCount: 28, joinedDate: '2025-10-11' },
  { id: 'c5',  name: 'Manoj Kannan',      avatarUrl: null, verified: false, ridesCount: 5,  joinedDate: '2026-05-02' },
  { id: 'c6',  name: 'Farhan Sheikh',     avatarUrl: null, verified: true,  ridesCount: 49, joinedDate: '2025-08-21' },
  { id: 'c7',  name: 'Gayathri Mohan',    avatarUrl: null, verified: true,  ridesCount: 38, joinedDate: '2025-09-17' },
  { id: 'c8',  name: 'Nikhil Sethu',      avatarUrl: null, verified: false, ridesCount: 2,  joinedDate: '2026-06-12' },
  { id: 'c9',  name: 'Revathi Chandran',  avatarUrl: null, verified: true,  ridesCount: 75, joinedDate: '2025-05-01' },
  { id: 'c10', name: 'Pranav Iyengar',    avatarUrl: null, verified: true,  ridesCount: 22, joinedDate: '2025-12-08' },
  { id: 'c11', name: 'Sneha Venkat',      avatarUrl: null, verified: true,  ridesCount: 33, joinedDate: '2025-10-25' },
  { id: 'c12', name: 'Bharath Raj',       avatarUrl: null, verified: false, ridesCount: 8,  joinedDate: '2026-03-19' },
  { id: 'c13', name: 'Janani Krishnamurthy', avatarUrl: null, verified: true, ridesCount: 61, joinedDate: '2025-06-14' },
  { id: 'c14', name: 'Arvind Swaminathan', avatarUrl: null, verified: true, ridesCount: 17, joinedDate: '2026-01-27' },
  { id: 'c15', name: 'Mahima Reddy',      avatarUrl: null, verified: true,  ridesCount: 41, joinedDate: '2025-09-05' },
]

const carVehicles = [
  { id: 'cv1', riderId: 'c1',  make: 'Mahindra', model: 'Thar 4x4',      year: 2023, mods: ['Snorkel', 'A/T tyres', 'Rock sliders'], photos: [], rideStyle: 'Offroad & Trails' },
  { id: 'cv2', riderId: 'c2',  make: 'Hyundai',  model: 'i20 N Line',    year: 2024, mods: ['Coilovers', 'Cat-back exhaust'], photos: [], rideStyle: 'Twisty Hill Runs' },
  { id: 'cv3', riderId: 'c3',  make: 'Skoda',    model: 'Octavia vRS',   year: 2021, mods: ['Stage 1 tune', 'Downpipe', 'BBK'], photos: [], rideStyle: 'Highway Grand Tours' },
  { id: 'cv4', riderId: 'c4',  make: 'Tata',     model: 'Nexon EV',      year: 2025, mods: [], photos: [], rideStyle: 'City & Night Cruises' },
  { id: 'cv5', riderId: 'c6',  make: 'Maruti Suzuki', model: 'Jimny',    year: 2024, mods: ['Roof rack', 'Ditch lights'], photos: [], rideStyle: 'Offroad & Trails' },
  { id: 'cv6', riderId: 'c7',  make: 'Honda',    model: 'City RS',       year: 2023, mods: ['Lowering springs'], photos: [], rideStyle: 'Weekend Convoys' },
  { id: 'cv7', riderId: 'c9',  make: 'Volkswagen', model: 'Polo GT TSI', year: 2020, mods: ['Stage 2 tune', 'Intercooler', 'Bucket seats'], photos: [], rideStyle: 'Track Mornings' },
  { id: 'cv8', riderId: 'c13', make: 'Toyota',   model: 'Fortuner',      year: 2022, mods: ['Ladder', 'Tow hitch'], photos: [], rideStyle: 'Highway Grand Tours' },
]

const carRides = [
  {
    id: 'drive1',
    title: 'ECR Sunrise Convoy to Mahabalipuram',
    captainId: 'c3',
    dateTime: '2026-07-26T05:45:00+05:30',
    meetupPin: { lat: 12.9915, lng: 80.2337, label: 'Thiruvanmiyur RTO Junction' },
    route: 'Thiruvanmiyur → ECR → Kovalam Bridge → Mahabalipuram lighthouse parking. Single-file convoy on the coast road, breakfast at the shore.',
    safetyNotes: 'Convoy rules: no overtaking the lead car, hazards on only at halts, minimum half tank at flag-off. Walkie channel 3 for the front and sweep cars. Two-minute gap rule after toll plazas.',
    attendees: ['c3', 'c1', 'c2', 'c7', 'c9', 'c11', 'c13', 'c15', 'c5'],
    capacity: 15,
    status: 'upcoming',
    distanceKm: 58,
  },
  {
    id: 'drive2',
    title: 'Night Shift: OMR Midnight Cruise',
    captainId: 'c2',
    dateTime: '2026-07-19T23:30:00+05:30',
    meetupPin: { lat: 12.9789, lng: 80.2005, label: 'Phoenix MarketCity, Velachery' },
    route: 'Velachery → OMR full stretch → Siruseri loop → back via ECR link road. Empty six-lane cruising after midnight.',
    safetyNotes: 'Strictly no racing, no lane weaving — this is a cruise, not a run. Speed capped at 90 km/h. DRLs and taillights checked at start. Convoy regroups at Navalur signal.',
    attendees: ['c2', 'c6', 'c10', 'c14', 'c1'],
    capacity: 12,
    status: 'live',
    distanceKm: 74,
  },
  {
    id: 'drive3',
    title: 'Coffee & Chrome: Detailing Meet',
    captainId: 'c7',
    dateTime: '2026-07-27T07:00:00+05:30',
    meetupPin: { lat: 13.0067, lng: 80.2206, label: 'Kotturpuram Bridge Parking' },
    route: 'Static meet — lineup and shine. Detailing demos, paint-correction booth, filter coffee cart. Bring the car you actually drive.',
    safetyNotes: 'Newcomer-friendly, unverified members welcome. Park only in marked bays, engines off during the lineup hour. No revving — residential block.',
    attendees: ['c7', 'c4', 'c8', 'c11', 'c15', 'c12'],
    capacity: 25,
    status: 'upcoming',
    distanceKm: 0,
  },
  {
    id: 'drive4',
    title: 'Yelagiri Hairpin Hill Run',
    captainId: 'c1',
    dateTime: '2026-08-01T04:30:00+05:30',
    meetupPin: { lat: 12.9165, lng: 80.1525, label: 'Tambaram Bypass HP Pump' },
    route: 'Tambaram → NH48 → Vaniyambadi → Yelagiri ghat, all 14 hairpins → Punganur Lake viewpoint → return after lunch.',
    safetyNotes: 'Experienced drivers only — minimum 15 logged drives. Brake check at the ghat base, engine braking downhill, no coasting in neutral. Overheating pull-out bays marked on the shared map.',
    attendees: ['c1', 'c3', 'c6', 'c9', 'c13'],
    capacity: 10,
    status: 'upcoming',
    distanceKm: 230,
  },
  {
    id: 'drive5',
    title: 'Women on Wheels: Marina Sunrise Drive',
    captainId: 'c9',
    dateTime: '2026-07-25T06:00:00+05:30',
    meetupPin: { lat: 13.0499, lng: 80.2824, label: 'Lighthouse, Marina Beach' },
    route: 'Lighthouse → Kamarajar Salai → Santhome → filter coffee at Mylapore. Women-led, women-only roster.',
    safetyNotes: 'Verified women drivers only — enforced by roster. Lead and sweep cars are marshals. Live route shared with emergency contacts via the app.',
    attendees: ['c9', 'c2', 'c4', 'c7', 'c11', 'c13', 'c15'],
    capacity: 15,
    status: 'upcoming',
    distanceKm: 16,
  },
  {
    id: 'drive6',
    title: 'Classics on the Bridge Show Drive',
    captainId: 'c6',
    dateTime: '2026-08-09T07:15:00+05:30',
    meetupPin: { lat: 13.0837, lng: 80.2702, label: 'Napier Bridge North End' },
    route: 'Napier Bridge lineup + photo run → Fort St. George → Rajaji Salai loop. Parade pace for the classics and restomods.',
    safetyNotes: 'Parade pace, 40 km/h. Pre-2000 cars get the front row. Marshals hold junctions — keep the convoy tight, no gaps.',
    attendees: ['c6', 'c3', 'c10', 'c12'],
    capacity: 20,
    status: 'upcoming',
    distanceKm: 12,
  },
  {
    id: 'drive7',
    title: 'Track Morning: Irungattukottai Laps',
    captainId: 'c13',
    dateTime: '2026-08-02T06:30:00+05:30',
    meetupPin: { lat: 12.9250, lng: 80.1000, label: 'Kundrathur Junction' },
    route: 'Kundrathur → Sriperumbudur → circuit paddock by 7:30. Three 20-minute open sessions, timing transponders at the pit desk.',
    safetyNotes: 'Helmets mandatory on track, long sleeves, tyre pressures checked cold. Tech inspection at the paddock — loose items out of the cabin. Passenger laps only in the final session.',
    attendees: ['c13', 'c5', 'c7', 'c10', 'c11', 'c14', 'c15'],
    capacity: 14,
    status: 'upcoming',
    distanceKm: 96,
  },
  {
    id: 'drive8',
    title: 'Sunset Convoy: Muttukadu Backwaters',
    captainId: 'c11',
    dateTime: '2026-07-24T16:45:00+05:30',
    meetupPin: { lat: 12.9611, lng: 80.2432, label: 'Sholinganallur Signal, OMR' },
    route: 'Sholinganallur → Kelambakkam → Muttukadu boat house for golden hour → ECR back. Rooftop-shot heaven for the photographers.',
    safetyNotes: 'Return leg after dark — full light check at start. Photographers park only in the marked bay; no drone flights over the boat house.',
    attendees: ['c11', 'c4', 'c8', 'c15'],
    capacity: 12,
    status: 'upcoming',
    distanceKm: 46,
  },
  {
    id: 'drive9',
    title: 'Pondicherry White Town Day Trip',
    captainId: 'c3',
    dateTime: '2026-07-12T05:30:00+05:30',
    meetupPin: { lat: 12.9915, lng: 80.2337, label: 'Thiruvanmiyur RTO Junction' },
    route: 'Thiruvanmiyur → ECR full stretch → Auroville → White Town café crawl → return by 7 PM. The classic Chennai convoy pilgrimage.',
    safetyNotes: 'Long haul — 320 km round trip. Fuel + stretch halts every 80 km. Carry DL and RC originals for the border. Sweep car carries a tow strap and jump pack.',
    attendees: ['c3', 'c1', 'c2', 'c6', 'c9', 'c10', 'c13', 'c14', 'c7'],
    capacity: 14,
    status: 'completed',
    distanceKm: 320,
  },
  {
    id: 'drive10',
    title: 'Monsoon Prep: Tyre & Brake Clinic',
    captainId: 'c1',
    dateTime: '2026-07-05T17:30:00+05:30',
    meetupPin: { lat: 13.0418, lng: 80.2341, label: 'Anna Nagar Tower Park Gate 2' },
    route: 'Static meet — no drive. Tread-depth and brake-pad checks, wiper and washer top-ups, underbody rust inspection on the ramp.',
    safetyNotes: 'Open to all members including unverified newcomers. Free tyre-pressure and battery-health checks while stocks last.',
    attendees: ['c1', 'c4', 'c5', 'c7', 'c8', 'c11', 'c12', 'c14', 'c15'],
    capacity: 30,
    status: 'completed',
    distanceKm: 0,
  },
]

const carRecaps = [
  {
    rideId: 'drive9',
    photos: [
      { id: 'p1', caption: 'Flag-off at first light, Thiruvanmiyur', src: IMG.fogRoad },
      { id: 'p2', caption: 'Convoy holding line on ECR', src: IMG.carMtnRoad },
      { id: 'p3', caption: 'Redwood tunnel, alone up front', src: IMG.forestRoad },
      { id: 'p4', caption: 'Cabin, tan leather, pre-convoy', src: IMG.interiorWarm },
      { id: 'p5', caption: 'Chrome and reflection, km 220', src: IMG.chromeDetail },
      { id: 'p6', caption: 'Misty promenade regroup', src: IMG.carFogMtn },
    ],
    statsSummary: { distanceKm: 320, movingTime: '7h 05m', avgSpeedKmh: 45, riders: 9, showUpRate: 90, fuelStops: 3 },
    attendeeIds: ['c3', 'c1', 'c2', 'c6', 'c9', 'c10', 'c13', 'c14', 'c7'],
  },
  {
    rideId: 'drive10',
    photos: [
      { id: 'p1', caption: 'Dashboard detail on the ramp', src: IMG.dashLeather },
      { id: 'p2', caption: 'Grille and pad checks', src: IMG.grilleDark },
      { id: 'p3', caption: 'Headlight polish, queue moving', src: IMG.headlightLux },
    ],
    statsSummary: { distanceKm: 0, movingTime: '2h 45m', avgSpeedKmh: 0, riders: 9, showUpRate: 90, fuelStops: 0 },
    attendeeIds: ['c1', 'c4', 'c5', 'c7', 'c8', 'c11', 'c12', 'c14', 'c15'],
  },
]

/* ================================================================
   MODE BUNDLES — data + copy + form config per mode
   ================================================================ */

const bikeCopy = {
  modeLabel: 'Two-Wheeler',
  otherModeLabel: 'Four-Wheeler',
  cityBadge: `Now riding in ${CITY}`,
  heroLines: ['RIDE WITH', 'PEOPLE WHO', 'SHOW UP.'],
  heroSub: 'REV replaces the chaos of WhatsApp rider groups with verified riders, real RSVPs, and Sunday rides that actually run.',
  browseCta: 'Browse meets',
  stats: [['1,500+', 'rides listed'], ['92%', 'RSVP show-up rate'], ['0', 'unverified captains']],
  ticker: ['ECR SUNRISE RUN', 'KOLLI HILLS · 70 HAIRPINS', 'MARINA DAWN PATROL', 'GST MIDNIGHT LOOP', 'PONDY DAY DASH', 'MUTTUKADU SUNSET', 'KANCHIPURAM TRAIL'],
  pillars: [
    { title: 'Verified riders only', body: 'Phone, RC and DL checks behind every verified badge. No ghosts, no creeps, no 40-message "who\'s coming?" threads.', volt: true },
    { title: 'RSVPs that mean it', body: 'One tap to ride. A live, verified attendee list with show-up accountability — captains finally know who\'s actually rolling out.' },
    { title: 'Rides worth finding', body: 'Sunrise ECR runs, 70-hairpin assaults, midnight loops — discoverable beyond your circle, with routes, pins and safety notes built in.' },
  ],
  loop: [
    ['01', 'Build your Garage', 'Your machine is your identity. Make, mods, ride style — useful from day one, friends or not.'],
    ['02', 'Find a meet', 'Local rides surfaced by distance, date and style. See exactly who\'s confirmed before you commit.'],
    ['03', 'RSVP & roll out', 'One tap. Verified roster, meetup pin, route and safety notes — the captain runs a tight ship.'],
    ['04', 'Relive the recap', 'Photos, stats and the riders you rolled with. The people you rode with become your people.'],
  ],
  ctaLines: ['THE ROAD IS', 'BETTER SHARED.'],
  ctaSub: `Join ${CITY}'s verified rider community. Your first Sunday run is waiting.`,
  ctaButton: 'Start riding with REV',
  feedEyebrow: 'Meets',
  feedLines: ['This week on', 'the tarmac.'],
  emptyFeedHint: 'Be the captain — create the first one.',
  ridingWord: 'riding',
  liveLabel: 'Live Ride',
  captain: 'Captain',
  captainTitle: 'Ride captain',
  backToFeed: 'All meets',
  safetyEyebrow: 'Safety brief — read before flag-off',
  rsvpCta: "RSVP — I'm riding",
  rsvpJoined: "You're on the roster.",
  rsvpBackOut: 'Back out — tell the captain',
  ridesA: 'Rides a',
  recapEyebrow: 'Post-ride recap',
  ledBy: 'Captained by',
  peopleWord: 'Riders',
  personPlural: 'riders',
  whoHeading: 'Who rode',
  whoSub: 'Everyone below was on the verified roster and rolled out. These are the people you rode with — your next connections on REV.',
  nextHint: 'The ECR sunrise run has spots open this Sunday.',
  nextCta: 'Browse upcoming meets',
  heroTag: "In the heart of Chennai's riding country",
  journey: [
    ['Leave at five.', "The city is still asleep. The coast road isn't."],
    ['Ride with the verified.', 'Every headlight beside you has a name, a face, a garage.'],
    ['Come back with a story.', "Photos, stats and the people you'll ride with again."],
  ],
  manifestoTitle: ['Built for the ones', 'who actually ride.'],
  garageSub: 'Your Garage is your identity on REV — captains see it when you RSVP, riders see it when you roll up.',
  wizardSteps: ['Bike details', 'Photos & mods', 'Ride style'],
  styleQuestion: 'How do you ride?',
  finishCta: 'Park it in the Garage',
  doneSub: 'This is your identity on REV — it rides with you to every meet.',
  findFirstCta: 'Find your first meet',
  logged: 'rides logged',
}

const carCopy = {
  modeLabel: 'Four-Wheeler',
  otherModeLabel: 'Two-Wheeler',
  cityBadge: `Now driving in ${CITY}`,
  heroLines: ['DRIVE WITH', 'PEOPLE WHO', 'SHOW UP.'],
  heroSub: 'REV replaces the chaos of WhatsApp car groups with verified drivers, real RSVPs, and weekend convoys that actually run.',
  browseCta: 'Browse drives',
  stats: [['1,200+', 'drives listed'], ['90%', 'RSVP show-up rate'], ['0', 'unverified leads']],
  ticker: ['ECR SUNRISE CONVOY', 'YELAGIRI · 14 HAIRPINS', 'MARINA SUNRISE DRIVE', 'OMR MIDNIGHT CRUISE', 'PONDY DAY TRIP', 'MUTTUKADU GOLDEN HOUR', 'TRACK MORNING LAPS'],
  pillars: [
    { title: 'Verified drivers only', body: 'Phone, RC and DL checks behind every badge. No ghosts, no flakes, no 40-message "who\'s coming?" threads.', volt: true },
    { title: 'RSVPs that mean it', body: 'One tap to join the convoy. A live, verified attendee list with show-up accountability — leads finally know who\'s actually rolling out.' },
    { title: 'Drives worth finding', body: 'Sunrise convoys, hill runs, track mornings, midnight cruises — discoverable beyond your circle, with routes, pins and convoy rules built in.' },
  ],
  loop: [
    ['01', 'Build your Garage', 'Your machine is your identity. Make, mods, drive style — useful from day one, friends or not.'],
    ['02', 'Find a drive', 'Local convoys surfaced by distance, date and style. See exactly who\'s confirmed before you commit.'],
    ['03', 'RSVP & roll out', 'One tap. Verified roster, meetup pin, route and convoy rules — the lead runs a tight ship.'],
    ['04', 'Relive the recap', 'Photos, stats and the drivers you rolled with. The people you drove with become your people.'],
  ],
  ctaLines: ['THE ROAD IS', 'BETTER SHARED.'],
  ctaSub: `Join ${CITY}'s verified driver community. Your first weekend convoy is waiting.`,
  ctaButton: 'Start driving with REV',
  feedEyebrow: 'Drives',
  feedLines: ['This week on', 'the open road.'],
  emptyFeedHint: 'Be the lead — create the first one.',
  ridingWord: 'in convoy',
  liveLabel: 'Live Drive',
  captain: 'Lead',
  captainTitle: 'Convoy lead',
  backToFeed: 'All drives',
  safetyEyebrow: 'Convoy brief — read before roll-out',
  rsvpCta: "RSVP — I'm driving",
  rsvpJoined: "You're in the convoy.",
  rsvpBackOut: 'Back out — tell the lead',
  ridesA: 'Drives a',
  recapEyebrow: 'Post-drive recap',
  ledBy: 'Led by',
  peopleWord: 'Drivers',
  personPlural: 'drivers',
  whoHeading: 'Who drove',
  whoSub: 'Everyone below was on the verified roster and rolled out. These are the people you drove with — your next connections on REV.',
  nextHint: 'The ECR sunrise convoy has spots open this Sunday.',
  nextCta: 'Browse upcoming drives',
  heroTag: "In the heart of Chennai's driving country",
  journey: [
    ['Roll out at first light.', 'Empty lanes, cool air, a convoy holding line.'],
    ['Drive with the verified.', 'Every car in your mirror has a name, a face, a garage.'],
    ['Come back with a story.', "Photos, stats and the people you'll drive with again."],
  ],
  manifestoTitle: ['Built for the ones', 'who actually drive.'],
  garageSub: 'Your Garage is your identity on REV — leads see it when you RSVP, drivers see it when you pull up.',
  wizardSteps: ['Car details', 'Photos & mods', 'Drive style'],
  styleQuestion: 'How do you drive?',
  finishCta: 'Park it in the Garage',
  doneSub: 'This is your identity on REV — it drives with you to every meet.',
  findFirstCta: 'Find your first drive',
  logged: 'drives logged',
}

const BIKE_MAKES = ['Royal Enfield', 'KTM', 'Bajaj', 'TVS', 'Yamaha', 'Honda', 'Triumph', 'Suzuki', 'Hero', 'Jawa', 'Other']
const CAR_MAKES = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Honda', 'Toyota', 'Volkswagen', 'Skoda', 'Kia', 'MG', 'Other']

const BIKE_STYLES = [
  { id: 'breakfast', label: 'Breakfast Runs', desc: 'Short Sunday loops that end at a café' },
  { id: 'touring', label: 'Long-Distance Touring', desc: 'Multi-day hauls. Leh is on the list.' },
  { id: 'twisties', label: 'Twisties & Ghats', desc: 'Hairpins, lean angle, hill country' },
  { id: 'city', label: 'City & Night Rides', desc: 'Midnight loops when the roads empty out' },
  { id: 'track', label: 'Track Days', desc: 'Leathers on, lap times down' },
  { id: 'cafe', label: 'Show & Shine', desc: 'Classics, customs, parade pace' },
]

const CAR_STYLES = [
  { id: 'convoy', label: 'Weekend Convoys', desc: 'Sunrise runs that end at a breakfast table' },
  { id: 'tours', label: 'Grand Tours', desc: 'Multi-day hauls. The full coast is on the list.' },
  { id: 'hills', label: 'Hill Runs & Hairpins', desc: 'Ghat roads, apexes, engine braking' },
  { id: 'night', label: 'City & Night Cruises', desc: 'Empty six-lane OMR after midnight' },
  { id: 'track', label: 'Track Mornings', desc: 'Helmet on, transponder in, laps down' },
  { id: 'show', label: 'Show & Detailing', desc: 'Classics, restomods, paint that mirrors' },
]

// Wizard step-1 extra field per mode (beyond make/model/year)
const bikeExtraField = {
  key: 'engineCc', label: 'Engine (cc)', type: 'number', min: 50, max: 2500,
  error: 'Enter a capacity between 50 and 2500 cc.', unit: 'cc',
}
const carExtraField = {
  key: 'transmission', label: 'Transmission', type: 'select',
  options: ['Manual', 'Automatic (TC)', 'AMT', 'CVT', 'DCT / DSG'],
}

/* ================================================================
   ROUTE GEOGRAPHY — real Chennai-area destination coords per ride.
   Attached centrally so the ride literals stay untouched; the map + route
   thumbnail draw a true meetup → destination line. Static meets point at
   their own meetup (marker only). Swaps cleanly for real GPX later.
   ================================================================ */
const DESTINATIONS = {
  ride1:  { lat: 12.6208, lng: 80.1945, label: 'Mahabalipuram Shore Temple' },
  ride2:  { lat: 12.6919, lng: 79.9760, label: 'Chengalpattu bypass' },
  ride3:  { lat: 12.9550, lng: 80.2590, label: 'Ciclo Café, Kotivakkam' },
  ride4:  { lat: 11.2480, lng: 78.3370, label: 'Kolli Hills — Agaya Gangai' },
  ride5:  { lat: 13.0339, lng: 80.2619, label: 'Mylapore' },
  ride6:  { lat: 13.0800, lng: 80.2870, label: 'Fort St. George' },
  ride7:  { lat: 12.8185, lng: 79.7036, label: 'Kanchipuram' },
  ride8:  { lat: 12.8330, lng: 80.2410, label: 'Muttukadu Boat House' },
  ride9:  { lat: 11.9340, lng: 79.8300, label: 'Pondicherry — White Town' },
  ride10: { lat: 13.0418, lng: 80.2341, label: 'Anna Nagar Tower Park' },
  drive1: { lat: 12.6208, lng: 80.1945, label: 'Mahabalipuram' },
  drive2: { lat: 12.8230, lng: 80.2270, label: 'Siruseri loop, OMR' },
  drive3: { lat: 13.0067, lng: 80.2206, label: 'Kotturpuram Bridge' },
  drive4: { lat: 12.5790, lng: 78.6420, label: 'Yelagiri — Punganur Lake' },
  drive5: { lat: 13.0339, lng: 80.2619, label: 'Mylapore' },
  drive6: { lat: 13.0800, lng: 80.2870, label: 'Fort St. George' },
  drive7: { lat: 13.0030, lng: 79.9560, label: 'Irungattukottai Circuit' },
  drive8: { lat: 12.8330, lng: 80.2410, label: 'Muttukadu Backwaters' },
  drive9: { lat: 11.9340, lng: 79.8300, label: 'Pondicherry — White Town' },
  drive10:{ lat: 13.0418, lng: 80.2341, label: 'Anna Nagar Tower Park' },
}
// gentle-curve waypoints between two points so the route reads as a path, not a
// ruler line — perpendicular offset at the midpoint, scaled to distance.
function arcPath(a, b, bend = 0.12) {
  const mx = (a.lat + b.lat) / 2, my = (a.lng + b.lng) / 2
  const dx = b.lat - a.lat, dy = b.lng - a.lng
  const mid = { lat: mx - dy * bend, lng: my + dx * bend }
  return [
    [a.lat, a.lng],
    [(a.lat + mid.lat) / 2, (a.lng + mid.lng) / 2],
    [mid.lat, mid.lng],
    [(mid.lat + b.lat) / 2, (mid.lng + b.lng) / 2],
    [b.lat, b.lng],
  ]
}
;[...bikeRides, ...carRides].forEach((r) => {
  const dest = DESTINATIONS[r.id]
  r.destination = dest
  const staticMeet = !dest || r.distanceKm === 0 ||
    (Math.abs(dest.lat - r.meetupPin.lat) < 1e-4 && Math.abs(dest.lng - r.meetupPin.lng) < 1e-4)
  r.routePath = staticMeet ? [[r.meetupPin.lat, r.meetupPin.lng]] : arcPath(r.meetupPin, dest)
})

// Curated real meetup / destination spots for the "create a ride" form so a
// user-made ride draws a true route on the map. Swaps for a geocoder later.
export const SPOTS = [
  { label: 'Thiruvanmiyur RTO Junction', lat: 12.9915, lng: 80.2337 },
  { label: 'Marina Lighthouse', lat: 13.0499, lng: 80.2824 },
  { label: 'Kotturpuram Bridge', lat: 13.0067, lng: 80.2206 },
  { label: 'Phoenix MarketCity, Velachery', lat: 12.9789, lng: 80.2005 },
  { label: 'Tambaram Bypass', lat: 12.9165, lng: 80.1525 },
  { label: 'Sholinganallur Signal, OMR', lat: 12.9010, lng: 80.2279 },
  { label: 'Anna Nagar Tower Park', lat: 13.0850, lng: 80.2101 },
  { label: 'Napier Bridge', lat: 13.0837, lng: 80.2702 },
  { label: 'Kelambakkam', lat: 12.7830, lng: 80.2210 },
  { label: 'ECR — Akkarai', lat: 12.9260, lng: 80.2530 },
  { label: 'Mahabalipuram Shore Temple', lat: 12.6208, lng: 80.1945 },
  { label: 'Muttukadu Boat House', lat: 12.8330, lng: 80.2410 },
  { label: 'Kanchipuram', lat: 12.8342, lng: 79.7036 },
  { label: 'Pondicherry — White Town', lat: 11.9340, lng: 79.8300 },
]

export function buildRoutePath(start, end) {
  if (!end || (Math.abs(start.lat - end.lat) < 1e-4 && Math.abs(start.lng - end.lng) < 1e-4)) {
    return [[start.lat, start.lng]]
  }
  return arcPath(start, end)
}

export function routeDistanceKm(path) {
  if (!path || path.length < 2) return 0
  const R = 6371, rad = (d) => (d * Math.PI) / 180
  let km = 0
  for (let i = 1; i < path.length; i++) {
    const [la1, lo1] = path[i - 1], [la2, lo2] = path[i]
    const a = Math.sin(rad(la2 - la1) / 2) ** 2 +
      Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2
    km += 2 * R * Math.asin(Math.sqrt(a))
  }
  return Math.round(km)
}

const bikeImages = {
  hero: IMG.bike,
  heroAlt: 'Classic maroon motorcycle resting in evening grass',
  heroVideo: IMG.vidMoto,
  heroPoster: IMG.vidMotoPoster,
  sequence: IMG.seqBike,
  journey: IMG.bikeHighway,
  journeyAlt: 'An adventure motorcycle alone on an open mountain highway',
  editorial: IMG.bikeWarm,
  editorialAlt: 'A classic Royal Enfield in warm autumn light',
  gallery: [
    { src: IMG.bikeTank, caption: 'Tooling, by hand' },
    { src: IMG.bikeDesert, caption: 'Ghat road, 6:04 AM' },
    { src: IMG.bikeOutdoor, caption: 'The Sunday parked-up' },
    { src: IMG.bikeLogo, caption: 'Nineteen fifty-five' },
  ],
  cta: IMG.bikeSunset,
  ctaAlt: 'A rider silhouetted against the setting sun',
  wizard: [IMG.bike, IMG.bikeWarm, IMG.bikeTank, IMG.bikeOutdoor, IMG.bikeDesert, IMG.bikeHighway],
}

const carImages = {
  hero: IMG.redCar,
  heroAlt: 'Red classic coupé in golden evening grass',
  heroVideo: IMG.vidDrive,
  heroPoster: IMG.vidDrivePoster,
  sequence: IMG.seqCar,
  journey: IMG.forestRoad,
  journeyAlt: 'A coupé alone on a redwood forest road',
  editorial: IMG.interiorWarm,
  editorialAlt: 'A vintage cabin trimmed in tan leather',
  gallery: [
    { src: IMG.carFogMtn, caption: 'Fog line, first light' },
    { src: IMG.chromeDetail, caption: 'Chrome, and a reflection' },
    { src: IMG.grilleDark, caption: 'Nineteen eighty-six' },
    { src: IMG.dashLeather, caption: 'Cabin, pre-convoy' },
  ],
  cta: IMG.carMtnRoad,
  ctaAlt: 'An aerial switchback through autumn mountains',
  wizard: [IMG.redCar, IMG.interiorWarm, IMG.carFogMtn, IMG.forestRoad, IMG.dashLeather, IMG.headlightLux],
}

/* ================================================================
   MEMBERSHIP — the value layer (mode-aware verbs)
   ================================================================ */
function buildMembership(mode) {
  const bike = mode === 'bike'
  const verb = bike ? 'ride' : 'drive'
  const verbIng = bike ? 'riding' : 'driving'
  const noun = bike ? 'rider' : 'driver'
  const plural = bike ? 'riders' : 'drivers'
  const captain = bike ? 'captain' : 'lead'

  return {
    // the five things membership gives you
    values: [
      { num: '01', title: 'Exclusive experiences', line: `Doors that don't open for everyone.`, body: `Closed-road rallies, sunrise ${verb}-outs and brand launches — the calendar you can't find in a group chat.` },
      { num: '02', title: 'Valuable connections', line: `A verified circle worth knowing.`, body: `Real people, real garages, real trust. The ${plural} you meet here become the ones you call.` },
      { num: '03', title: 'Savings', line: `A membership that pays for itself.`, body: `Fuel, tyres, detailing, cafés and resorts — partner rates that quietly cover the cost of belonging.` },
      { num: '04', title: 'Status', line: `Recognition you earn on the road.`, body: `Badges, tiers and ${captain} standing — a reputation that travels with your name, not your follower count.` },
      { num: '05', title: 'Convenience', line: `The logistics ${verb} with you.`, body: `RSVP, routes, rosters and roadside backup — one tap, and the rest of the run organises itself.` },
    ],
    // the nine concrete things inside
    benefits: [
      { icon: 'calendar', title: 'Curated weekend drives', desc: `A fresh, hand-picked ${verb} every week — vetted route, ${captain}, and pace, ready to RSVP.`, value: 'Exclusive', span: 'lg' },
      { icon: 'shield', title: 'Verified driving clubs', desc: `Join clubs with real rosters and reputations. No ghosts, no gatekept WhatsApp links.`, value: 'Connections' },
      { icon: 'map', title: 'Route discovery', desc: `Hidden ghats, coastal detours and breakfast stops — surfaced from the community's best runs.`, value: 'Exclusive' },
      { icon: 'users', title: 'Meetups & rallies', desc: `Show-and-shine mornings, city meets and multi-day rallies you actually want to be at.`, value: 'Connections' },
      { icon: 'shield-plus', title: 'Roadside community support', desc: `Break down and the nearest verified ${noun} gets pinged. A safety net that rides with you.`, value: 'Convenience', span: 'lg' },
      { icon: 'tag', title: 'Member savings', desc: `Live discounts on fuel, detailing, tyres, cafés and weekend resorts.`, value: 'Savings' },
      { icon: 'spark', title: 'Brand events', desc: `First access to launches, test ${verb}s and track days with the marques you love.`, value: 'Status' },
      { icon: 'trophy', title: 'Driving challenges', desc: `Gamified streaks and distance quests — earn points, climb the board, win real rewards.`, value: 'Status' },
      { icon: 'badge', title: 'Badges & recognition', desc: `Premium, earned badges that mark the ${plural} who show up — and keep showing up.`, value: 'Status' },
    ],
    // savings ledger
    savings: {
      headline: '₹42,000',
      note: `Average member savings a year across partner fuel, tyres, detailing and stays.`,
      partners: [
        { cat: 'Fuel', deal: 'up to 4%' },
        { cat: 'Tyres', deal: '10–18%' },
        { cat: 'Detailing', deal: '15%' },
        { cat: 'Cafés', deal: '10%' },
        { cat: 'Resorts', deal: '12–20%' },
        { cat: 'Track days', deal: 'member rate' },
      ],
    },
    // gamified challenges + badges
    challenges: [
      { name: 'Sunrise Streak', goal: `Five dawn ${verb}s in a month`, reward: '+500 pts · Early Bird badge' },
      { name: 'The Long Way', goal: `1,000 km logged in 30 days`, reward: '+1,200 pts · Century badge' },
      { name: 'Ghat Sweeper', goal: `Every hairpin on the state's best pass`, reward: '+800 pts · Trailblazer badge' },
    ],
    badges: [
      { name: 'Founding Member', tone: 'accent' },
      { name: 'Ghost Buster · 100% show-up', tone: 'volt' },
      { name: 'Century · 100 rides', tone: 'accent' },
      { name: `${bike ? 'Ride' : 'Drive'} Captain`, tone: 'ink' },
    ],
    // membership tiers (status + recognition)
    tiers: [
      {
        name: 'Member',
        price: 'Free',
        cadence: 'forever',
        tagline: `Everything you need to ${verb} with the community.`,
        perks: ['Verified garage profile', 'Discover & RSVP to meets', 'Verified attendee lists', 'Community badges'],
        featured: false,
      },
      {
        name: 'Club',
        price: '₹149',
        cadence: '/month',
        tagline: `The full membership — savings, challenges, status.`,
        perks: ['Everything in Member', 'Partner discounts & savings', 'Driving challenges & rewards', 'Priority RSVP & club access', 'Premium recognition badges'],
        featured: true,
      },
      {
        name: 'Captain',
        price: 'Invite',
        cadence: 'only',
        tagline: `For the ${plural} who lead the runs.`,
        perks: ['Everything in Club', 'Host verified rides & rallies', 'Brand-event access', 'Concierge route planning'],
        featured: false,
      },
    ],
  }
}

const bundles = {
  bike: {
    accent: ACCENTS.bike,
    copy: bikeCopy,
    images: bikeImages,
    membership: buildMembership('bike'),
    riders: bikeRiders,
    vehicles: bikeVehicles,
    rides: bikeRides,
    recaps: bikeRecaps,
    makes: BIKE_MAKES,
    styles: BIKE_STYLES,
    extraField: bikeExtraField,
  },
  car: {
    accent: ACCENTS.car,
    copy: carCopy,
    images: carImages,
    membership: buildMembership('car'),
    riders: carDrivers,
    vehicles: carVehicles,
    rides: carRides,
    recaps: carRecaps,
    makes: CAR_MAKES,
    styles: CAR_STYLES,
    extraField: carExtraField,
  },
}

/* Ride dates were authored against a fixed day, so a "live" ride drifted into
   the past and upcoming ones expired. Anchor every date to the current date
   instead, keeping the authored time of day, so the feed always reads true.
   Real rides come from the database with real timestamps; this only keeps the
   sample data honest. */
function anchorDates(rides) {
  const upcomingGaps = [0, 1, 2, 4, 6, 9, 13, 20] // days ahead, in listed order
  const completedGaps = [3, 8, 15, 24, 33]        // days behind
  let up = 0
  let done = 0

  return rides.map((r) => {
    const authored = new Date(r.dateTime)
    const at = new Date()

    if (r.status === 'live') {
      // started 40 minutes ago — genuinely under way
      at.setTime(Date.now() - 40 * 60 * 1000)
    } else if (r.status === 'completed') {
      at.setDate(at.getDate() - (completedGaps[done % completedGaps.length]))
      at.setHours(authored.getHours(), authored.getMinutes(), 0, 0)
      done++
    } else {
      at.setDate(at.getDate() + upcomingGaps[up % upcomingGaps.length])
      at.setHours(authored.getHours(), authored.getMinutes(), 0, 0)
      // a ride "today" whose hour has already passed would read as stale
      if (at.getTime() < Date.now()) at.setDate(at.getDate() + 7)
      up++
    }
    return { ...r, dateTime: at.toISOString() }
  })
}

export function getModeBundle(mode) {
  const b = bundles[mode] ?? bundles.bike
  return {
    ...b,
    rides: anchorDates(b.rides),
    getRider: (id) => (id === 'me' ? currentUser : b.riders.find((r) => r.id === id)),
    getVehicleFor: (riderId) => b.vehicles.find((v) => v.riderId === riderId),
    getRecap: (rideId) => b.recaps.find((r) => r.rideId === rideId),
  }
}
