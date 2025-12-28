## Zero Density RealityHub 2.1

This module allows you to control Zero Density RealityHub 2.1.

**Requirements:**
* The "REST API" server feature must be licensed and enabled (Configuration > License > Server Features > REST API)
* A REST API key is required for authentication
* Companion must be on the same network as the RealityHub server

### Creating a REST API Key in RealityHub

1. Navigate to **User Management** in RealityHub
2. Your user account must have **REST API Management** right enabled to access the REST API Keys section
3. In the left sidebar under **Management Objects**, expand **REST API Keys**
4. Click the **+** button to create a new API key
5. Give your API key a name (e.g., "Companion")
6. In the **Acquired Modules** section, enable the modules this API key should have access to:
   * **Lino** - Required for rundown control
   * **Launcher** - Required for engine management
   * **Nodegraph Editor** - Required for node property control
7. Click **Copy to Clipboard** to copy the API key

### Module Configuration
* Enter the IP address of your RealityHub server
* Enter your REST API key (required for authentication)
* Select additional features this module should provide
* Decide whether additional features should update their data automatically
* When the "Templates" feature is selected, a rundown name to store all templates in must be provided


**Available Actions:**
* Basic: Do Transition
* Basic: Enable Render
* Basic: Load Feature Data
* Basic: Set Constant Data Value
* Basic: Set Media File Path
* Basic: Set Mixer Channel
* Basic: Trigger Function
* Basic: Trigger Media Function
* Node: Set Property Value
* Node: Trigger Function
* Rundown: Button Press
* Template: Button Press

**Available Feedbacks:**
* Basic: Check Constant Data Value
* Basic: Display Constant Data Value
* Basic: Feature Data Loading
* Basic: Feature Selected
* Basic: Media File Path
* Basic: Mixer Channel
* Node: Check Property Value
* Rundown: Button Label
* Template: Button Label

**Available Variables:**
* Connected Engines
* Engine Names
* Engine Roles
* Engine States
* Engine IP-Addresses
* Engine Active Project Launched
* Update Engines-Data Duration
* Update Nodes-Data Duration
* Update Nodes-Data Progress
* Update Rundowns-Data Duration
* Update Rundowns-Data Progress
* Update Templates-Data Duration
* Update Templates-Data Progress
