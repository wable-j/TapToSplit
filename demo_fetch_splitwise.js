/**
 * TapToSplit - Secure Fetch Groups & Members Script
 * 
 * Deploy this as a Google Apps Script Web App.
 * Your iOS shortcut will send a POST request with a JSON body here 
 * to retrieve your Splitwise groups and members securely.
 */

function doPost(e) {
  try {
    // Parse the JSON body sent from the iOS Shortcut
    const requestData = JSON.parse(e.postData.contents);

    // 1. Get the API Key securely from the POST body, keeping URLs clean!
    const apiKey = requestData.api_key;
    
    if (!apiKey) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: "Missing API Key. Please provide it in your JSON request body." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. SCENARIO A: Target a Specific Group (Fetch Members)
    // Expects JSON: { "api_key": "XYZ", "group_name": "Goa" }
    if (requestData.group_name) {
      const groupName = requestData.group_name;
      
      // Fetch all groups from Splitwise
      const groupsUrl = "https://secure.splitwise.com/api/v3.0/get_groups";
      const response = makeAuthenticatedRequest(groupsUrl, apiKey);
      
      // Search for the specific group (Fuzzy matching)
      const cleanedInput = groupName.replace(/\s+/g, '').toLowerCase();
      let targetGroup = response.groups.find(g => g.name.replace(/\s+/g, '').toLowerCase() === cleanedInput) ||
                        response.groups.find(g => g.name.replace(/\s+/g, '').toLowerCase().includes(cleanedInput));
      
      if (!targetGroup) {
         return ContentService
          .createTextOutput(JSON.stringify({ error: `Group '${groupName}' not found.` }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Format members neatly for the iOS Shortcut list menu
      const members = targetGroup.members.map(u => {
        return u.last_name ? `${u.first_name} ${u.last_name}` : u.first_name;
      });

      return ContentService
        .createTextOutput(JSON.stringify({ members: members }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    
    // 3. SCENARIO B: No Group Name provided (Fetch All Groups)
    // Expects JSON: { "api_key": "XYZ" }
    else {
      const groupsUrl = "https://secure.splitwise.com/api/v3.0/get_groups";
      const response = makeAuthenticatedRequest(groupsUrl, apiKey);
      
      // We filter out group 0 (Non-group expenses) and groups with no members
      const activeGroups = response.groups
        .filter(g => g.id !== 0 && g.members.length > 0)
        .map(g => g.name);

      return ContentService
        .createTextOutput(JSON.stringify({ groups: activeGroups }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Helper Functions ---
function makeAuthenticatedRequest(url, apiKey) {
  const options = {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
  };
  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}
