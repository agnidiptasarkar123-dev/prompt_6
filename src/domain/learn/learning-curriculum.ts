// SPDX-License-Identifier: Apache-2.0

export type LearnCategoryId = "pollutants" | "naqi" | "provenance" | "indoor";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface FlashcardItem {
  readonly id: string;
  readonly front: string;
  readonly back: string;
}

export interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

export interface LearningLesson {
  readonly id: string;
  readonly category: LearnCategoryId;
  readonly code: string;
  readonly title: string;
  readonly shortSummary: string;
  readonly badge: string;
  readonly unit: string;
  readonly cpcbWindow: string;
  readonly levels: Readonly<Record<DifficultyLevel, string>>;
  readonly sources: readonly string[];
  readonly environmentalEffects: string;
  readonly healthImplications: string;
  readonly cpcbMethodology: string;
  readonly misconceptions: string;
  readonly precautions: string;
  readonly examples: readonly string[];
  readonly keyTerms: readonly { readonly term: string; readonly definition: string }[];
  readonly references: readonly string[];
  readonly recap: string;
  readonly flashcards: readonly FlashcardItem[];
  readonly quiz: readonly QuizQuestion[];
}

export const LEARNING_LESSONS: readonly LearningLesson[] = [
  {
    id: "pm25",
    category: "pollutants",
    code: "PM2.5",
    title: "PM2.5 — Fine Particulate Matter",
    shortSummary: "Microscopic inhalable particles with diameter <= 2.5 µm capable of reaching deep lung alveoli.",
    badge: "Type C Parameter",
    unit: "µg/m³",
    cpcbWindow: "24-hour rolling average (minimum 16 valid hours)",
    levels: {
      beginner: "PM2.5 refers to tiny airborne soot, dust, and smoke droplets thinner than 1/30th the width of a human hair. Because they are so small, normal nose hairs cannot trap them completely.",
      intermediate: "PM2.5 combines directly emitted primary soot (from vehicles, crop/waste burning, and brick kilns) with secondary sulfates and nitrates formed chemically in urban air. Indian winter surface temperature inversions trap PM2.5 near street level.",
      advanced: "Under MoEFCC CPCB NAQI (2014), PM2.5 is reported over 24-hour intervals (min 16/24 hours for sub-index eligibility). Breakpoints map 0–30 µg/m³ (Good, 0–50), 30–60 (Satisfactory, 51–100), 60–90 (Moderate, 101–200), 90–120 (Poor, 201–300), 120–250 (Very Poor, 301–400), and >250 (Severe, 401–500)."
    },
    sources: ["Diesel & petrol exhaust", "Biomass & crop-residue burning", "Thermal power & brick kilns", "Secondary atmospheric reactions"],
    environmentalEffects: "Reduces urban atmospheric visibility (winter haze), deposits black carbon on leaves, and alters regional radiation balance.",
    healthImplications: "Non-diagnostic public-health guidance: prolonged exposure is associated with airway inflammation and aggravated asthma or cardiac stress, especially in children and older adults.",
    cpcbMethodology: "Calculated via piecewise linear interpolation on 24h average PM2.5 (µg/m³); requires PM2.5 or PM10 plus >=2 other valid pollutants for an overall CPCB AQI.",
    misconceptions: "Clear blue afternoons do not automatically guarantee safe winter evenings once thermal inversions lower mixing height after sunset.",
    precautions: "Move intense outdoor exercise indoors during Poor/Very Poor episodes, wear well-fitted N95/FFP2 masks near traffic, and run True HEPA purifiers indoors.",
    examples: ["At 90 µg/m³ (24h avg), the PM2.5 CPCB sub-index equals 200 (upper boundary of Moderate).", "Diwali/winter evening biomass smoke spikes PM2.5 sharply within 2 hours while 24h averages lag until sustained."],
    keyTerms: [
      { term: "Aerodynamic Diameter (<=2.5 µm)", definition: "Size threshold describing airborne settling behaviour comparable to a 2.5 µm water sphere." },
      { term: "Thermal Inversion", definition: "Cool surface air trapped beneath warmer air aloft, suppressing vertical pollution dispersion." }
    ],
    references: ["MoEFCC / CPCB National Air Quality Index (NAQI 2014)", "WHO Global Air Quality Guidelines (non-diagnostic context)"],
    recap: "PM2.5 (<2.5 µm) is tracked in µg/m³ over 24h windows (16h minimum) and is a mandatory particulate option for valid CPCB AQI.",
    flashcards: [
      { id: "pm25-fc-1", front: "What unit and minimum hourly completeness does CPCB NAQI require for PM2.5?", back: "Units of µg/m³ with a 24-hour rolling average requiring at least 16 valid hourly observations." },
      { id: "pm25-fc-2", front: "Why does PM2.5 climb rapidly on calm winter evenings in Indian cities?", back: "Lower nocturnal mixing heights and surface temperature inversions trap local traffic and biomass emissions near ground level." },
      { id: "pm25-fc-3", front: "What sub-index corresponds to PM2.5 = 60 µg/m³ under CPCB NAQI?", back: "Sub-index 100 (upper boundary of Satisfactory)." }
    ],
    quiz: [
      { id: "pm25-q-1", prompt: "What is the minimum valid hour count needed in a 24h window to compute a CPCB PM2.5 sub-index?", options: ["8 hours", "12 hours", "16 hours", "24 hours"], correctIndex: 2, explanation: "CPCB NAQI requires at least 16 valid hours (67% completeness) in a 24-hour window." },
      { id: "pm25-q-2", prompt: "Can overall CPCB AQI be valid without either PM2.5 or PM10?", options: ["Yes, with CO and NO2 only", "No, PM2.5 or PM10 is mandatory", "Yes, during monsoon"], correctIndex: 1, explanation: "Official CPCB NAQI rules require at least 3 valid pollutants AND at least one of PM2.5 or PM10." }
    ]
  },
  {
    id: "pm10",
    category: "pollutants",
    code: "PM10",
    title: "PM10 — Coarse Particulate Matter",
    shortSummary: "Inhalable coarse particles (<= 10 µm) dominated by road dust resuspension, construction, and pollen.",
    badge: "Type C Parameter",
    unit: "µg/m³",
    cpcbWindow: "24-hour rolling average (minimum 16 valid hours)",
    levels: {
      beginner: "PM10 includes larger windblown dust grains and construction grit smaller than 10 micrometres—roughly one-seventh the width of a hair—which mainly irritate your nose, throat, and upper airways.",
      intermediate: "While PM2.5 comes largely from combustion, PM10 spikes strongly around dry unpaved roads, demolition work, concrete batching, and pre-monsoon dust storms across the Indo-Gangetic plain and coastal deltas.",
      advanced: "CPCB NAQI breakpoints for PM10 (24h, µg/m³): 0–50 (Good, AQI 0–50), 50–100 (Satisfactory, 51–100), 100–250 (Moderate, 101–200), 250–350 (Poor, 201–300), 350–430 (Very Poor, 301–400), >430 (Severe, 401–500). Measured via Beta Attenuation Monitors (BAM) or TEOM."
    },
    sources: ["Paved & unpaved road dust resuspension", "Construction & demolition sites", "Regional dust storms", "Industrial crushing & mining"],
    environmentalEffects: "Settles onto solar panels, buildings, and urban foliage, reducing light transmission and soil permeability.",
    healthImplications: "Triggers upper-respiratory throat irritation, coughing, and allergic rhinitis flare-ups on dry, windy days.",
    cpcbMethodology: "24-hour rolling mean (µg/m³, min 16 valid hours). Notice all PM2.5 particles physically form a subset inside PM10.",
    misconceptions: "Sprinkling water suppresses coarse PM10 road dust temporarily, but does not remove gaseous pollutants or fine combustion aerosols.",
    precautions: "Wet-mop indoor floors instead of dry sweeping so settled coarse particles are not kicked back into household breathing air.",
    examples: ["Dry roadside sweeping elevates local PM10 sharply while HEPA vacuums and wet-mopping reduce indoor resuspension."],
    keyTerms: [
      { term: "Resuspension", definition: "Re-lifting of settled road or construction dust into ambient air by tyre turbulence and wind." },
      { term: "PM2.5/PM10 Ratio", definition: "Higher ratios indicate combustion dominance; low ratios indicate mineral/construction dust dominance." }
    ],
    references: ["MoEFCC / CPCB NAQI (2014)", "NCAP Urban Road-Dust Management Manuals"],
    recap: "PM10 (<10 µm, µg/m³, 24h avg) captures both coarse mineral dust and fine PM2.5, with breakpoints 100->100 and 250->200.",
    flashcards: [
      { id: "pm10-fc-1", front: "Why does wet-mopping outperform dry sweeping for indoor dust control?", back: "Dry sweeping resuspends settled PM10 back into breathing height, whereas damp mopping captures particles without re-aerosolization." },
      { id: "pm10-fc-2", front: "What does a low PM2.5/PM10 ratio typically indicate?", back: "Coarse mineral dust, construction, or roadside resuspension dominance rather than fresh combustion smoke." }
    ],
    quiz: [
      { id: "pm10-q-1", prompt: "Which urban source contributes disproportionately to PM10 over PM2.5?", options: ["Dry road dust and construction", "Atmospheric photochemistry", "Natural ozone layer"], correctIndex: 0, explanation: "Mechanical abrasion, construction, and resuspended road dust primarily produce coarse PM10 fractions." }
    ]
  },
  {
    id: "no2",
    category: "pollutants",
    code: "NO2",
    title: "NO₂ — Nitrogen Dioxide",
    shortSummary: "Reddish-brown traffic-corridor oxidant gas emitted by high-temperature fuel combustion.",
    badge: "Type C Parameter",
    unit: "µg/m³",
    cpcbWindow: "24-hour rolling average (minimum 16 valid hours)",
    levels: {
      beginner: "NO₂ is a sharp traffic exhaust gas produced when engines burn diesel or petrol at high temperatures. Levels peak right beside busy junctions and flyovers.",
      intermediate: "Vehicles emit NO and NO₂ together (NOx). In sunlit air, NO rapidly oxidizes into NO₂, which also reacts with volatile organic compounds (VOCs) to generate ground-level ozone (O₃).",
      advanced: "CPCB NAQI uses 24-hour mean NO₂ in µg/m³ (0–40 Good, 40–80 Satisfactory, 80–180 Moderate, 180–280 Poor, 280–400 Very Poor, >400 Severe). OpenAQ streams in ppb convert via 298 K factor 1.88 µg/m³ per ppb."
    },
    sources: ["Diesel trucks & buses", "Two-wheelers & passenger cars", "Gas stoves without exhaust hoods", "Power plants"],
    environmentalEffects: "Precursor to urban photochemical smog, ground-level O₃, secondary nitrate aerosols, and acid deposition.",
    healthImplications: "Can heighten bronchial airway reactivity in asthmatics and irritate respiratory linings during kerbside commutes.",
    cpcbMethodology: "Chemiluminescence analyzers at CAAQMS stations; unit conversion ppb -> µg/m³ requires verified temperature/pressure metadata (1.88 factor at 25°C, 1 atm).",
    misconceptions: "Standard HEPA particle filters capture particulate matter, NOT NO₂ gas molecules—activated carbon media or source exhaust is required for gases.",
    precautions: "Switch on kitchen exhaust during LPG cooking, avoid idling behind diesel vehicles at signals, and prefer quieter side-streets when walking.",
    examples: ["Walking one block off an arterial highway often lowers kerbside NO₂ exposure compared with walking right beside idling traffic."],
    keyTerms: [
      { term: "NOx", definition: "Sum of nitric oxide (NO) and nitrogen dioxide (NO2) emitted by combustion." },
      { term: "1.88 µg/m³/ppb", definition: "Standard 25°C molar mass conversion factor from ppb to µg/m³ for NO2." }
    ],
    references: ["CPCB NAQI (2014)", "OpenAQ / ISO Standard Atmospheric Conversion (46.0055 g/mol)"],
    recap: "NO₂ (µg/m³, 24h avg) tracks traffic exhaust and indoor unvented gas stoves; HEPA alone does not remove gaseous NO₂.",
    flashcards: [
      { id: "no2-fc-1", front: "Does a pure HEPA filter remove NO₂ gas?", back: "No. HEPA filters trap particles; removing NO₂ requires activated carbon adsorption or source/ventilation control." },
      { id: "no2-fc-2", front: "What unit does CPCB NAQI use for NO₂ sub-index calculation?", back: "Micrograms per cubic metre (µg/m³) over a 24-hour rolling average." }
    ],
    quiz: [
      { id: "no2-q-1", prompt: "What practical step reduces indoor NO₂ from gas cooking?", options: ["Using a HEPA-only fan with closed exhaust", "Turning on external kitchen exhaust ventilation", "Sealing all windows permanently"], correctIndex: 1, explanation: "External exhaust vents combustion gases (NO₂, CO, ultrafines) directly outdoors." }
    ]
  },
  {
    id: "so2",
    category: "pollutants",
    code: "SO2",
    title: "SO₂ — Sulphur Dioxide",
    shortSummary: "Colourless pungent gas from sulphur-containing coal/oil combustion and smelting.",
    badge: "Type C Parameter",
    unit: "µg/m³",
    cpcbWindow: "24-hour rolling average (minimum 16 valid hours)",
    levels: {
      beginner: "SO₂ is a sharp-smelling gas released when fuels containing sulphur—such as coal or heavy furnace oil—are burned in power plants and factories.",
      intermediate: "In humid air, SO₂ oxidizes into sulphate aerosols that contribute significantly to regional PM2.5 haze hundreds of kilometres downwind of industrial corridors.",
      advanced: "CPCB NAQI evaluates 24h average SO₂ in µg/m³ (0–40 Good, 40–80 Satisfactory, 80–380 Moderate, 380–800 Poor, 800–1600 Very Poor). HawaSaathi rejects unverified OpenAQ SO₂ ppb metadata when numeric scales mismatch unit labels."
    },
    sources: ["Coal-fired power stations", "Brick kilns & industrial boilers", "Refineries & metal smelters"],
    environmentalEffects: "Causes acid rain that damages soils, water bodies, and stone monuments, and drives secondary sulphate PM2.5.",
    healthImplications: "Acute airway constriction possible for people with asthma when industrial plumes pass overhead.",
    cpcbMethodology: "UV fluorescence monitoring over 24h window. Unverified or ambiguous unit feeds must be skipped for sub-index calculations.",
    misconceptions: "BS-VI automotive fuels dramatically lowered urban road SO₂, making coal/industrial zones the dominant modern source.",
    precautions: "Monitor industrial corridor alerts and keep indoor air recirculating cleanly with carbon pre-filters if outdoor sulphur odour occurs.",
    examples: ["HawaSaathi marks SO2 (ppb) sub-index computation as skipped rather than mis-scaling unverified numeric values."],
    keyTerms: [
      { term: "Secondary Sulphate", definition: "Fine PM2.5 aerosol formed chemically in air from gaseous SO2 oxidation." }
    ],
    references: ["CPCB NAQI (2014)", "MoEFCC Fuel & Emission Norms"],
    recap: "SO₂ (µg/m³, 24h avg) arises mainly from coal/industrial fuel burning and feeds secondary PM2.5.",
    flashcards: [
      { id: "so2-fc-1", front: "Why does HawaSaathi skip SO₂ sub-indices when upstream sensor units are unverified ppb?", back: "Mislabeled OpenAQ sensor metadata can report mg/m³ or µg/m³ numbers under a 'ppb' tag; skipping avoids fabricating false near-zero sub-indices." }
    ],
    quiz: [
      { id: "so2-q-1", prompt: "What secondary pollutant does SO₂ form in humid atmospheres?", options: ["Ground ozone directly without NOx", "Secondary sulphate PM2.5 aerosols", "Lead particulate"], correctIndex: 1, explanation: "SO₂ oxidizes into sulphate aerosols that form fine PM2.5." }
    ]
  },
  {
    id: "co",
    category: "pollutants",
    code: "CO",
    title: "CO — Carbon Monoxide",
    shortSummary: "Odourless, colourless incomplete-combustion gas measured on 8-hour CPCB averaging windows.",
    badge: "Type C Parameter",
    unit: "mg/m³",
    cpcbWindow: "8-hour rolling average (minimum 6/8 valid hours internal gate)",
    levels: {
      beginner: "CO is an invisible gas with no smell formed when petrol, wood, charcoal, or LPG does not burn completely—especially in idling traffic or poorly ventilated rooms.",
      intermediate: "Unlike the other CPCB gases reported in µg/m³, CO uses milligrams per cubic metre (mg/m³) because concentrations are ~1000x larger by mass. Road intersections and indoor sigris/geysers are key risks.",
      advanced: "CPCB NAQI assigns 8h CO breakpoints in mg/m³ (0–1.0 Good, 1.0–2.0 Satisfactory, 2.0–10.0 Moderate, 10–17 Poor, 17–34 Very Poor). At 25°C, 1 ppm CO = 1.145 mg/m³. Note that HEPA particulate purifiers do NOT remove CO gas."
    },
    sources: ["Congested vehicle idling", "Incomplete biomass/charcoal burning", "Unvented gas geysers or indoor stoves"],
    environmentalEffects: "Participates slowly in tropospheric ozone chemistry and lengthens atmospheric methane lifetime.",
    healthImplications: "Binds haemoglobin to reduce oxygen delivery; unvented indoor combustion in sealed rooms is an acute hazard.",
    cpcbMethodology: "Non-dispersive infrared (NDIR) analyzer over an 8h window in mg/m³; unit precision checking refuses ambiguous ppb metadata.",
    misconceptions: "Closing every window completely while burning incense, charcoal, or unvented gas appliances indoors can trap CO—because particle purifiers cannot clear it.",
    precautions: "Never seal rooms tightly when operating combustion stoves or geysers; maintain safe ventilation and avoid car idling in enclosed parking.",
    examples: ["Swapping unit 1.5 ppm CO via 1.145 mg/m³ per ppm yields ~1.72 mg/m³ (Satisfactory band)."],
    keyTerms: [
      { term: "mg/m³", definition: "Milligrams per cubic metre (1000x larger mass unit than µg/m³), standard CPCB unit for CO." }
    ],
    references: ["CPCB NAQI (2014)", "NCDC / MoHFW Indoor Safety Advisories"],
    recap: "CO (mg/m³, 8h window) is an odourless gas NOT removed by HEPA filters—never seal homes with active indoor combustion.",
    flashcards: [
      { id: "co-fc-1", front: "Why is CO measured in mg/m³ while NO₂, SO₂, and O₃ are in µg/m³?", back: "Ambient CO occurs at roughly 1000x higher mass concentrations than trace gases, so CPCB uses mg/m³ on 8-hour windows." },
      { id: "co-fc-2", front: "Does running a HEPA purifier make a sealed room with a charcoal heater safe from CO?", back: "No. Particle filters do not remove gaseous carbon monoxide; safe external ventilation is mandatory." }
    ],
    quiz: [
      { id: "co-q-1", prompt: "What averaging window and unit does CPCB NAQI specify for CO?", options: ["24h in µg/m³", "8h in mg/m³", "1h in ppm"], correctIndex: 1, explanation: "CO uses an 8-hour averaging period measured in mg/m³." }
    ]
  },
  {
    id: "o3",
    category: "pollutants",
    code: "O3",
    title: "O₃ — Ground-Level Ozone",
    shortSummary: "Secondary photochemical oxidant gas peaking on sunny afternoons from NOx + VOC reactions.",
    badge: "Type C Parameter",
    unit: "µg/m³",
    cpcbWindow: "8-hour rolling average (minimum 6/8 valid hours internal gate)",
    levels: {
      beginner: "Up in the high stratosphere, ozone shields Earth from UV rays—but at street level on hot sunny afternoons, ozone is a harsh lung-irritating gas created when sunlight cooks exhaust fumes.",
      intermediate: "Ground-level O₃ is NOT emitted directly out of tailpipes; instead, sunlight reacts with NOx and organic vapours. It often peaks away from heavy traffic corridors where fresh NO titration drops.",
      advanced: "Evaluated on 8-hour windows in µg/m³ under CPCB NAQI (0–50 Good, 50–100 Satisfactory, 100–168 Moderate, 168–208 Poor, 208–748 Very Poor). Notice midday hours sometimes improve PM2.5 via vertical mixing while elevating O₃."
    },
    sources: ["Photochemical reaction of vehicle/industrial NOx + VOCs in sunlight", "Fuel evaporation & solvents"],
    environmentalEffects: "Damages crop leaf stomata (reducing wheat and rice yields) and degrades rubber/polymers.",
    healthImplications: "Causes chest tightness and shortness of breath during afternoon outdoor sports even when PM2.5 looks lower.",
    cpcbMethodology: "UV photometry over 8h running averages; checks must separate 1h peaks cleanly from 8h regulatory windows.",
    misconceptions: "Electronic ionizer 'purifiers' can actually generate harmful indoor O₃—avoid ozone-emitting air cleaners.",
    precautions: "Schedule vigorous afternoon outdoor sports in mornings/shaded periods during high-O₃ summer afternoons and avoid ozone-generating ionizers.",
    examples: ["High midday sunlight breaks up winter PM2.5 inversions yet accelerates afternoon O₃ formation on clear warm days."],
    keyTerms: [
      { term: "Secondary Pollutant", definition: "Pollutant formed chemically in the atmosphere rather than emitted directly from a source." }
    ],
    references: ["CPCB NAQI (2014)", "IEST / ASHRAE Ozone-Free Filtration Guidance"],
    recap: "O₃ (µg/m³, 8h avg) forms in sunlight from NOx + VOCs; avoid ozone-generating ionizers and monitor afternoon peaks.",
    flashcards: [
      { id: "o3-fc-1", front: "Why should households avoid 'ionizer' air purifiers marketed as air fresheners?", back: "Many electronic ionizers emit ground-level O₃, a respiratory irritant, whereas mechanical True HEPA + carbon filtration is ozone-free." }
    ],
    quiz: [
      { id: "o3-q-1", prompt: "When does ground-level O₃ typically peak?", options: ["Deep foggy midnight", "Warm sunny afternoons", "Inside sealed damp basements"], correctIndex: 1, explanation: "Sunlight drives photochemical conversion of NOx and VOCs into O₃ during afternoon hours." }
    ]
  },
  {
    id: "nh3",
    category: "pollutants",
    code: "NH3",
    title: "NH₃ — Ammonia",
    shortSummary: "Alkaline gas released from agriculture, fertilizer volatilization, and organic waste decomposition.",
    badge: "Type C Parameter",
    unit: "µg/m³",
    cpcbWindow: "24-hour rolling average (minimum 16 valid hours)",
    levels: {
      beginner: "NH₃ is a sharp alkaline gas coming mainly from fertilizers, livestock waste, sewage, and open waste dumps rather than cars.",
      intermediate: "In urban air, ammonia reacts with nitric and sulphuric acids (from NO₂ and SO₂) to create solid ammonium nitrate and ammonium sulphate particles—a major hidden fraction of winter PM2.5.",
      advanced: "CPCB NAQI tracks 24h mean NH₃ in µg/m³ across wide thresholds (0–200 Good, 200–400 Satisfactory, 400–800 Moderate). Even when NH₃ stays Good on its own sub-index, it strongly accelerates secondary PM2.5 nucleation."
    },
    sources: ["Agricultural fertilizer application", "Sewage & solid-waste decomposition", "Dairy/livestock farming & cold-storage leaks"],
    environmentalEffects: "Reacting precursor to secondary inorganic PM2.5 aerosols and aquatic eutrophication.",
    healthImplications: "Direct eye/throat irritation near intense industrial/waste releases; indirect cardiovascular/respiratory burden via secondary PM2.5.",
    cpcbMethodology: "Chemiluminescence / ammonia converter over 24h windows (µg/m³).",
    misconceptions: "Urban smog is not exclusively tailpipe soot; rural-to-urban agricultural NH₃ combines with urban NOx to amplify winter PM2.5.",
    precautions: "Keep organic household waste covered cleanly and track PM2.5 sub-indices when regional agricultural plumes reach the city.",
    examples: ["Secondary ammonium nitrate increases sharply during humid, cold North Indian winter nights."],
    keyTerms: [
      { term: "Precursor Gas", definition: "Gaseous compound that chemically transforms into fine particulate matter downwind." }
    ],
    references: ["CPCB NAQI (2014)", "NCAP Regional Secondary Aerosol Studies"],
    recap: "NH₃ (µg/m³, 24h avg) neutralizes urban acids in air to form a large share of winter secondary PM2.5.",
    flashcards: [
      { id: "nh3-fc-1", front: "How does agricultural NH₃ worsen city PM2.5?", back: "NH₃ neutralizes acidic NOx and SO₂ products in humid air to form ammonium nitrate and ammonium sulphate fine particles." }
    ],
    quiz: [
      { id: "nh3-q-1", prompt: "What happens when NH₃ reacts with NO₂/SO₂ oxidation products in humid air?", options: ["Air becomes sterile", "Secondary inorganic PM2.5 aerosols form", "Ozone drops to zero globally"], correctIndex: 1, explanation: "Ammonia forms ammonium salts that contribute substantially to winter PM2.5 mass." }
    ]
  },
  {
    id: "pb",
    category: "pollutants",
    code: "Pb",
    title: "Pb — Lead Particulate",
    shortSummary: "Toxic heavy-metal particulate regulated over 24h CPCB intervals.",
    badge: "Type C Parameter",
    unit: "µg/m³",
    cpcbWindow: "24-hour rolling average (minimum 16 valid hours)",
    levels: {
      beginner: "Lead (Pb) is a heavy metal particle. Phasing out leaded petrol eliminated most road lead, so modern hotspots occur near informal battery recycling or metal smelting.",
      intermediate: "Lead accumulates in dust and soil rather than breaking down over time. Children face the highest risk if lead-bearing dust enters homes on shoes or clothes.",
      advanced: "CPCB NAQI monitors 24h Pb in µg/m³ with tight health-protective breakpoints (0–0.5 Good, 0.5–1.0 Satisfactory, 1.0–2.0 Moderate, 2.0–3.0 Poor, >3.5 Severe). Automated CAAQMS feeds often omit real-time Pb (manual gravimetric XRF/AAS sampling is typical)."
    },
    sources: ["Informal lead-acid battery dismantling", "Secondary metal smelting", "Industrial paint & ceramic dust"],
    environmentalEffects: "Persistent heavy metal accumulation in topsoil, sediments, and food webs.",
    healthImplications: "Non-diagnostic public-health fact: bioaccumulates with developmental and neurological sensitivity, particularly in young children.",
    cpcbMethodology: "Manual 24h filter sampling with laboratory ICP-MS / AAS / XRF analysis; typically absent from automated hourly OpenAQ feeds.",
    misconceptions: "Leaving out Pb does not prevent a valid CPCB AQI—any >=3 of the 8 regulated pollutants including PM2.5 or PM10 suffices.",
    precautions: "Leave outdoor footwear at entryways, damp-dust sills near workshops, and wash children's hands before meals.",
    examples: ["CAAQMS stations commonly compute valid Type B CPCB AQI from PM2.5, PM10, NO2, and O3 without continuous Pb sensors."],
    keyTerms: [
      { term: "Bioaccumulation", definition: "Gradual buildup of persistent metals in biological tissues faster than elimination." }
    ],
    references: ["CPCB NAQI (2014)", "NAAQS India 2009 Filter Reference Method"],
    recap: "Pb (µg/m³, 24h) has strict 0.5–3.5 µg/m³ breakpoints; usually lab-sampled manually rather than hourly CAAQMS.",
    flashcards: [
      { id: "pb-fc-1", front: "Does missing Pb block a station from computing overall CPCB AQI?", back: "No. CPCB NAQI requires at least 3 valid pollutants with >=1 being PM2.5 or PM10; Pb is rarely streamed continuously." }
    ],
    quiz: [
      { id: "pb-q-1", prompt: "Why is Pb typically absent from hourly OpenAQ streams?", options: ["Lead turns into oxygen", "Pb usually requires 24h filter collection and laboratory analysis", "Lead does not exist in cities"], correctIndex: 1, explanation: "Heavy metals like Pb are generally measured via manual filter sampling and laboratory spectroscopy." }
    ]
  },
  {
    id: "cpcb-naqi",
    category: "naqi",
    code: "CPCB NAQI",
    title: "CPCB NAQI (2014) Calculation Standard",
    shortSummary: "How India's statutory piecewise linear interpolation and minimum completeness rules determine AQI.",
    badge: "Type A / B Methodology",
    unit: "Dimensionless Index (0–500+)",
    cpcbWindow: "24h (PM/NO2/SO2/NH3/Pb) & 8h (CO/O3)",
    levels: {
      beginner: "AQI converts different pollutant weights (µg/m³ or mg/m³) onto one 0–500 scale colour-coded across six bands from Good to Severe—determined by whichever single pollutant scores highest.",
      intermediate: "A composite CPCB AQI is valid ONLY if >= 3 pollutants have complete data AND at least one is PM2.5 or PM10. Otherwise, HawaSaathi refuses to guess a score and marks AQI Unavailable.",
      advanced: "Each eligible pollutant sub-index uses piecewise linear interpolation $$I_p = \\frac{I_{Hi} - I_{Lo}}{BP_{Hi} - BP_{Lo}} (C_p - BP_{Lo}) + I_{Lo}$$, taking `max(I_p)` across valid parameters. CPCB NAQI specifies the 16/24h rule for 24h windows; HawaSaathi adds a conservative 6/8h internal engineering gate for CO/O3."
    },
    sources: ["MoEFCC / CPCB NAQI Technical Report (2014)"],
    environmentalEffects: "Standardizes cross-city severity communication using the dominant critical pollutant.",
    healthImplications: "Six statutory advisory bands (Good 0–50, Satisfactory 51–100, Moderate 101–200, Poor 201–300, Very Poor 301–400, Severe 401–500).",
    cpcbMethodology: "Strictly separates Type A (official CPCB CAAQMS bulletin AQI) from Type B (independently computed by HawaSaathi from raw valid concentrations).",
    misconceptions: "Overall AQI is NOT an average of sub-indices—it equals the maximum valid sub-index!",
    precautions: "Always inspect whether a station reports sufficient >=3 pollutants before comparing stations across a city.",
    examples: ["If PM2.5 = 90 µg/m³ -> sub-index 200; at 95.78 µg/m³ -> (300-200)/(120-90)*(95.78-90)+200 = 219.27 -> 219 (Poor)."],
    keyTerms: [
      { term: "Prominent Pollutant", definition: "The single pollutant with the highest sub-index driving overall AQI." },
      { term: "Insufficient Window", definition: "Fewer than 16/24 valid hours for 24h pollutants or fewer than 6/8 hours under our internal 8h gate." }
    ],
    references: ["MoEFCC / CPCB NAQI (2014) Guideline Document", "HawaSaathi CPCB Sub-Index Engine (sub-index-calculator.ts)"],
    recap: "AQI = max(sub-indices), valid only with >=3 pollutants including PM2.5/PM10; HawaSaathi never fabricates AQI when rules fail.",
    flashcards: [
      { id: "naqi-fc-1", front: "Is overall CPCB AQI the average or the maximum of valid pollutant sub-indices?", back: "The MAXIMUM: AQI = max(I_1, I_2, ..., I_n), identifying that highest parameter as the prominent pollutant." },
      { id: "naqi-fc-2", front: "What is the verified sub-index formula for CPCB NAQI?", back: "Piecewise linear interpolation: I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo." }
    ],
    quiz: [
      { id: "naqi-q-1", prompt: "If a station has valid PM2.5 (sub-index 220), PM10 (148), and NO2 (141), what is overall CPCB AQI?", options: ["170 (mean)", "220 (maximum sub-index)", "509 (sum)"], correctIndex: 1, explanation: "Overall AQI equals the highest sub-index (220), with PM2.5 as the prominent pollutant." }
    ]
  },
  {
    id: "type-a-d",
    category: "provenance",
    code: "Type A–D",
    title: "Type A–D Data Provenance Classification",
    shortSummary: "Understanding official bulletins, calculated AQI, raw sensors, and 45 km atmospheric forecasts.",
    badge: "Provenance Standard",
    unit: "Metadata & Quality Flags",
    cpcbWindow: "Varies by observation/forecast typology",
    levels: {
      beginner: "Not every air number means the same thing! Some come from official government bulletins (Type A), some are computed carefully from raw sensors (Type B/C), and forecasts are computer weather simulations (Type D).",
      intermediate: "Type A is CPCB-published official AQI. Type B is computed identically by HawaSaathi when raw hourly streams pass completeness checks. Type C is raw sensor mass (µg/m³ / mg/m³) when overall AQI cannot be assembled. Type D is CAMS Global atmospheric model forecast.",
      advanced: "Strict provenance contracts track observationTime, retrievalTime, unit verification, averagingPeriod, and quality flags (VERIFIED, PROVISIONAL, STALE, MODEL_FORECAST). A 45 km CAMS forecast must NEVER masquerade as a street-level ground measurement."
    },
    sources: ["CPCB CAAQMS data.gov.in (GODL-India)", "OpenAQ v3 Hourly Streams (CC BY 4.0)", "Open-Meteo CAMS Global (CC BY 4.0)"],
    environmentalEffects: "Prevents false confidence by making sensor gaps, missing units, and spatial resolution explicit.",
    healthImplications: "Avoids false 'Moderate' reassurance on incomplete snapshots by keeping AQI_UNAVAILABLE transparent.",
    cpcbMethodology: "Cached readings never alter observationTime; >24h observations trigger explicit STALE classification.",
    misconceptions: "Open-Meteo's ~45 km regional grid cell smooths local traffic spikes and is NOT equivalent to a kerbside station.",
    precautions: "Check the Provenance Inspector badge before citing station numbers or treating forecasts as guarantees.",
    examples: ["data.gov.in snapshots lacking physical units remain Type C Raw with overallAqi = null instead of fabricated Type A/B AQI."],
    keyTerms: [
      { term: "Type B vs Type A", definition: "Type B is calculated by HawaSaathi using verified CPCB math; Type A is published directly by CPCB." },
      { term: "Type D Model Forecast", definition: "Regional numerical weather/dispersion simulation (~45 km grid), never measured ground truth." }
    ],
    references: ["HawaSaathi Data Provenance Contract", "Open-Meteo CAMS Attribution"],
    recap: "Type A = Official Bulletin, Type B = HawaSaathi CPCB Math, Type C = Raw Sensor Value, Type D = Regional 45km Model Forecast.",
    flashcards: [
      { id: "prov-fc-1", front: "Why does HawaSaathi label computed OpenAQ-derived AQI as Type B instead of Type A?", back: "Honest provenance: Type A is reserved strictly for direct CPCB-published AQI, whereas Type B denotes HawaSaathi's independent CPCB-formula calculation from raw hours." },
      { id: "prov-fc-2", front: "Is a Type D CAMS forecast a street-level sensor measurement?", back: "No. CAMS Global is a ~45 km regional atmospheric model simulation intended for planning dispersion trends." }
    ],
    quiz: [
      { id: "prov-q-1", prompt: "Which data type describes Copernicus CAMS atmospheric predictions?", options: ["Type A", "Type B", "Type C", "Type D"], correctIndex: 3, explanation: "Modelled atmospheric forecasts carry Type D (MODEL_FORECAST) provenance." }
    ]
  },
  {
    id: "cadr-ventilation",
    category: "indoor",
    code: "CADR & ACH",
    title: "CADR, Air Changes per Hour & Safe Ventilation",
    shortSummary: "Sizing mechanical particle filtration accurately while avoiding combustion and sealing hazards.",
    badge: "Indoor Air Science",
    unit: "m³/h, CFM, ACH",
    cpcbWindow: "Calculated capacity (NEVER measured indoor AQI)",
    levels: {
      beginner: "CADR tells you how much clean, filtered air an air purifier pushes out every hour. Dividing that by your bedroom's volume gives Air Changes per Hour (ACH)—a sizing estimate, not a room sensor reading.",
      intermediate: "To aim for ~4.5 ACH (ASHRAE / Harvard Healthy Buildings heuristic), a 60 m³ room needs 60 × 4.5 = 270 m³/h (~159 CFM) CADR. Maintain kitchen exhaust when cooking so particles and gases like CO do not accumulate.",
      advanced: "Engineering sizing formulas: $$V = L \\times W \\times H$$, $$CADR = V \\times ACH$$, and $$1\\text{ CFM} = 1.69901\\text{ m}^3/\\text{h}$$. Note IEST RP-CC001 Type A (>=99.97% at 0.3 µm) and EN 1822 H13 (>=99.95% at MPPS) test flat media; real-world room clearance depends on delivered CADR and HEPA does not capture gaseous CO."
    },
    sources: ["ASHRAE / Harvard Healthy Buildings 4.5 ACH heuristic", "MoHFW / NCDC Indoor Advisories"],
    environmentalEffects: "Focuses electrical energy on right-sized purification without ozone generation.",
    healthImplications: "Avoid sealing rooms tightly when cooking, burning incense/dhoop, or operating unvented gas appliances—safe external exhaust prevents CO buildup.",
    cpcbMethodology: "ACH derived from CADR/volume is ALWAYS labelled Calculated, never Measured indoor PM2.5.",
    misconceptions: "True HEPA captures particulate matter (PM2.5/PM10), NOT gaseous CO or carbon dioxide.",
    precautions: "Ventilate briefly during comparatively lower-pollution midday windows unless an indoor sensor validates continuous safe CO/PM2.5.",
    examples: ["A 4m × 5m × 3m room (60 m³) paired with a 300 m³/h purifier gives a Calculated capacity of 5.0 ACH."],
    keyTerms: [
      { term: "CADR", definition: "Clean Air Delivery Rate: cubic metres of particle-filtered air delivered per hour (m³/h or CFM)." },
      { term: "ACH (Calculated)", definition: "Estimated room volume turnovers per hour (CADR / Volume); NOT a direct indoor pollutant measurement." }
    ],
    references: ["Harvard Healthy Buildings / ASHRAE 62.2 Guidance", "HawaSaathi Filtration Calculator (filtration-calculator.ts)"],
    recap: "CADR = Volume × Target ACH (~4.5 heuristic). ACH is always Calculated; HEPA filters particles, never CO gas.",
    flashcards: [
      { id: "cadr-fc-1", front: "What formula links purifier CADR (m³/h), room volume (m³), and Air Changes per Hour (ACH)?", back: "ACH = CADR / Room Volume (so Required CADR = Room Volume × Target ACH, with 1 CFM = 1.69901 m³/h)." },
      { id: "cadr-fc-2", front: "If your room has a HEPA purifier running, is calculated ACH equal to 'measured indoor AQI'?", back: "No. Calculated ACH is a theoretical capacity metric based on geometry and CADR; actual indoor air requires a physical indoor sensor." }
    ],
    quiz: [
      { id: "cadr-q-1", prompt: "What is the Calculated ACH of a 300 m³/h purifier inside a 60 m³ bedroom?", options: ["0.2 ACH", "3.0 ACH", "5.0 ACH"], correctIndex: 2, explanation: "300 m³/h divided by 60 m³ equals 5.0 ACH (Calculated)." }
    ]
  }
];

export function getLessonById(topicId: string): LearningLesson {
  return LEARNING_LESSONS.find((l) => l.id === topicId) ?? LEARNING_LESSONS[0]!;
}
