/* States and territories for the four state-specific civics questions (23, 29, 61, 62).
   Capitals are stable and come from this list. Senators, representatives, and
   governors change, so the app lets each learner save their own answers on their
   device. STATE_DEFAULTS below pre-fills verified current officials for California. */
var STATES = [
  { code: "AL", name: "Alabama", capital: "Montgomery" },
  { code: "AK", name: "Alaska", capital: "Juneau" },
  { code: "AZ", name: "Arizona", capital: "Phoenix" },
  { code: "AR", name: "Arkansas", capital: "Little Rock" },
  { code: "CA", name: "California", capital: "Sacramento" },
  { code: "CO", name: "Colorado", capital: "Denver" },
  { code: "CT", name: "Connecticut", capital: "Hartford" },
  { code: "DE", name: "Delaware", capital: "Dover" },
  { code: "FL", name: "Florida", capital: "Tallahassee" },
  { code: "GA", name: "Georgia", capital: "Atlanta" },
  { code: "HI", name: "Hawaii", capital: "Honolulu" },
  { code: "ID", name: "Idaho", capital: "Boise" },
  { code: "IL", name: "Illinois", capital: "Springfield" },
  { code: "IN", name: "Indiana", capital: "Indianapolis" },
  { code: "IA", name: "Iowa", capital: "Des Moines" },
  { code: "KS", name: "Kansas", capital: "Topeka" },
  { code: "KY", name: "Kentucky", capital: "Frankfort" },
  { code: "LA", name: "Louisiana", capital: "Baton Rouge" },
  { code: "ME", name: "Maine", capital: "Augusta" },
  { code: "MD", name: "Maryland", capital: "Annapolis" },
  { code: "MA", name: "Massachusetts", capital: "Boston" },
  { code: "MI", name: "Michigan", capital: "Lansing" },
  { code: "MN", name: "Minnesota", capital: "Saint Paul" },
  { code: "MS", name: "Mississippi", capital: "Jackson" },
  { code: "MO", name: "Missouri", capital: "Jefferson City" },
  { code: "MT", name: "Montana", capital: "Helena" },
  { code: "NE", name: "Nebraska", capital: "Lincoln" },
  { code: "NV", name: "Nevada", capital: "Carson City" },
  { code: "NH", name: "New Hampshire", capital: "Concord" },
  { code: "NJ", name: "New Jersey", capital: "Trenton" },
  { code: "NM", name: "New Mexico", capital: "Santa Fe" },
  { code: "NY", name: "New York", capital: "Albany" },
  { code: "NC", name: "North Carolina", capital: "Raleigh" },
  { code: "ND", name: "North Dakota", capital: "Bismarck" },
  { code: "OH", name: "Ohio", capital: "Columbus" },
  { code: "OK", name: "Oklahoma", capital: "Oklahoma City" },
  { code: "OR", name: "Oregon", capital: "Salem" },
  { code: "PA", name: "Pennsylvania", capital: "Harrisburg" },
  { code: "RI", name: "Rhode Island", capital: "Providence" },
  { code: "SC", name: "South Carolina", capital: "Columbia" },
  { code: "SD", name: "South Dakota", capital: "Pierre" },
  { code: "TN", name: "Tennessee", capital: "Nashville" },
  { code: "TX", name: "Texas", capital: "Austin" },
  { code: "UT", name: "Utah", capital: "Salt Lake City" },
  { code: "VT", name: "Vermont", capital: "Montpelier" },
  { code: "VA", name: "Virginia", capital: "Richmond" },
  { code: "WA", name: "Washington", capital: "Olympia" },
  { code: "WV", name: "West Virginia", capital: "Charleston" },
  { code: "WI", name: "Wisconsin", capital: "Madison" },
  { code: "WY", name: "Wyoming", capital: "Cheyenne" },
  { code: "DC", name: "District of Columbia", capital: null, note: "D.C. is not a state. It has no governor, no U.S. senators, and no state capital." },
  { code: "PR", name: "Puerto Rico", capital: "San Juan", territory: true },
  { code: "GU", name: "Guam", capital: "Hagåtña", territory: true },
  { code: "VI", name: "U.S. Virgin Islands", capital: "Charlotte Amalie", territory: true },
  { code: "AS", name: "American Samoa", capital: "Pago Pago", territory: true },
  { code: "MP", name: "Northern Mariana Islands", capital: "Saipan", territory: true }
];

/* Civics question id -> field in the saved local profile. */
var LOCAL_QUESTION = {
  23: "senator",
  29: "representative",
  61: "governor",
  62: "capital"
};

/* Verified current California officials for the optional state form (Nov 5, 2026).
   Sources:
   - Senators: senate.gov/states/CA/senators.htm lists Alex Padilla (Class 3) and
     Adam B. Schiff (Class 1). Q23 asks for one; either name is correct.
   - Representative: congress.gov lists Kevin Mullin for CA-15. ZIP 94303 spans
     CA-15 (62.3%) and CA-16 (37.7%, Sam Liccardo) in the California Senate Office
     of Demographics ZIP directory; confirm the address at house.gov if unsure.
   - Governor: gov.ca.gov and nga.org/governors still list Gavin Newsom. Xavier
     Becerra won the Nov 3, 2026 election and takes office in January 2027, so
     this answer must change then.
   - Capital (Q62): Sacramento, already in STATES above.
   USCIS asks for the official serving on the day of the interview, so re-check
   these at uscis.gov/citizenship/testupdates before the test. */
var STATE_DEFAULTS = {
  CA: {
    senator: "Alex Padilla",
    representative: "Kevin Mullin",
    governor: "Gavin Newsom"
  }
};
