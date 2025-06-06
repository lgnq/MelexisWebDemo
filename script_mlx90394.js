const menuButtons = document.querySelectorAll(".menu-button");
const screenOverlay = document.querySelector(".main-layout .screen-overlay");
const themeButton = document.querySelector(".navbar .theme-button i");

// Toggle sidebar visibility when menu buttons are clicked
menuButtons.forEach(button => {
  button.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-hidden");
  });
});

// Toggle sidebar visibility when screen overlay is clicked
screenOverlay.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-hidden");
});

// Initialize dark mode based on localStorage
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
  themeButton.classList.replace("uil-moon", "uil-sun");
} else {
  themeButton.classList.replace("uil-sun", "uil-moon");
}

// Toggle dark mode when theme button is clicked
themeButton.addEventListener("click", () => {
  const isDarkMode = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDarkMode ? "enabled" : "disabled");
  themeButton.classList.toggle("uil-sun", isDarkMode);
  themeButton.classList.toggle("uil-moon", !isDarkMode);
});

// Show sidebar on large screens by default
if (window.innerWidth >= 768) {
  document.body.classList.remove("sidebar-hidden");
}

//================================================
let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

let prefix;
let separator;

let data = [0, 0, 0];

let plots = [];

let x = 0;
let y = 0;
let z = 0;

let sensitivity = 1.5;

let alpha = 0;
let beta  = 0;

let displacement = 0;
let heading = 0;

let angle_xy = 0;
let angle_xz = 0;
let angle_yz = 0;

let size = 300;

let formula_alpha;
let formula_beta;

const maxLogLength  = 50;
const baudRates     = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000];

let config = 
{
  responsive: true,
  editable: true,
  displayModeBar: false,
}

let layout_xyz = {
  autosize: true,
  // margin: { t: 5, b: 5, l: 5, r: 5 },

  title: {
    text: 'XYZ',
    font: {
        // family: 'Arial, monospace',
        family: 'Arial, sans-serif', // Set the font family to Arial
        size: 20
    },
    yref: 'paper',
    automargin: true,
  },
  
  xaxis: {
    title: 'time',
    showgrid: false,
    zeroline: false
  },

  yaxis: {
    title: 'Magnetic flux(uT)',
    showline: false
  },  

  plot_bgcolor: 'rgba(255, 255, 255, 0)', // 设置图表背景透明
  paper_bgcolor: 'rgba(255, 255, 255, 0)', // 设置画布背景透明  
};

let trace_x = {
  // type: 'scattergl',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'x',
  // fill: 'tozeroy',
  line: {
    color: 'rgb(0, 53, 75)',
    width: 1
  }
};

let trace_y = {
  // type: 'line',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'y',
  line: {
    color: 'rgb(101, 187, 169)',
    width: 1
  }
};

let trace_z = {
  // type: 'scattergl',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'z',
  line: {
    color: 'rgb(219, 65, 64)',
    width: 1
  }
};

let data_xyz = [trace_x, trace_y, trace_z];

let layout_ab = {
  autosize: true,
  // margin: { t: 5, b: 5, l: 5, r: 5 },

  title: {
    text: 'Alpha & Beta',
    font: {
        // family: 'Arial, monospace',
        family: 'Arial, sans-serif', // Set the font family to Arial
        size: 20
    },
    yref: 'paper',
    automargin: true,
  },
  
  xaxis: {
    title: 'time',
    showgrid: false,
    zeroline: false
  },

  yaxis: {
    title: 'angle',
    showline: false
  },  

  plot_bgcolor: 'rgba(255, 255, 255, 0)', // 设置图表背景透明
  paper_bgcolor: 'rgba(255, 255, 255, 0)', // 设置画布背景透明  
};

let trace_a = {
  // type: 'scattergl',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'alpha',
  // fill: 'tozeroy',
  line: {
    color: 'rgb(219, 65, 64)',
    width: 1
  }
};

let trace_b = {
  // type: 'line',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'beta',
  line: {
    color: 'rgb(101, 187, 169)',
    width: 1
  }
};

let data_ab = [trace_a, trace_b];

const log           = document.getElementById('log');
const butConnect    = document.getElementById('butConnect');
const baudRate      = document.getElementById('baudRate');
const autoscroll    = document.getElementById('autoscroll');
const showTimestamp = document.getElementById('showTimestamp');
const myInput       = document.getElementById('myInput');
const butStart      = document.getElementById('butStart');

async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }

  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }

  await port.close();
  port = null;
}

function toggleUIConnected(connected) {
  let lbl = 'Connect';

  if (connected) {
    lbl = 'Disconnect';
  }

  butConnect.textContent = lbl;
  
  // updateTheme()
}

function logData(line) {
  // Update the Log
  if (showTimestamp.checked) {
    let d = new Date();
    let timestamp = d.getHours() + ":" + `${d.getMinutes()}`.padStart(2, 0) + ":" +
        `${d.getSeconds()}`.padStart(2, 0) + "." + `${d.getMilliseconds()}`.padStart(3, 0);

    log.innerHTML += '<span class="timestamp">' + timestamp + ' -> </span>';
    
    d = null;
  }

  log.innerHTML += line+ "<br>";

  // Remove old log content
  if (log.textContent.split("\n").length > maxLogLength + 1) {
    let logLines = log.innerHTML.replace(/(\n)/gm, "").split("<br>");
    
    log.innerHTML = logLines.splice(-maxLogLength).join("<br>\n");
  }

  if (autoscroll.checked) {
    log.scrollTop = log.scrollHeight;
  }
}

class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = '';
  }

  transform(chunk, controller) {
    this.container += chunk;
    const lines = this.container.split('\n');
    this.container = lines.pop();
    lines.forEach(line => {
      controller.enqueue(line)
      logData(line);
    });
  }

  flush(controller) {
    controller.enqueue(this.container);
  }
}

async function readLoop() {
  while (true) {
    const {value, done} = await reader.read();
      
    if (value) {
      if (value.substr(0, prefix.length) == prefix) {
        data = value.substr(prefix.length).trim().split(separator).map(x=>+x);

        x = data[0] * sensitivity;
        y = data[1] * sensitivity;
        z = data[2] * sensitivity;

        displacement = Math.atan(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / z);
        heading      = Math.atan2(y, x);
    
        angle_xy = Math.atan2(y, x);
    
        if (angle_xy < 0)
          angle_xy += 2*Math.PI;
      
        angle_xy = (angle_xy / Math.PI) * 180;  
    
        // angle_xz = Math.atan2(z, x);
        angle_xz = eval(formula_alpha);
    
        if (angle_xz < 0)
          angle_xz += 2*Math.PI;
      
        angle_xz = (angle_xz / Math.PI) * 180;  
        
        // angle_yz = Math.atan2(z, y);
        angle_yz = eval(formula_beta);
    
        if (angle_yz < 0)
          angle_yz += 2*Math.PI;
      
        angle_yz = (angle_yz / Math.PI) * 180;  
        
        alpha = angle_xz.toFixed(3);
        beta  = angle_yz.toFixed(3);

        for (let i = 0; i < plots.length; i++)
        {
          Plotly.extendTraces(plots[i], {y:[[x], [y], [z]]}, [0, 1, 2], size);
        }

        Plotly.extendTraces(plot_ab, {y:[[alpha], [beta]]}, [0, 1], size);
    
        if (trace_x.y.length > size)
          trace_x.y.pop();
        if (trace_y.y.length > size)
          trace_y.y.pop();
        if (trace_z.y.length > size)
          trace_z.y.pop();

        if (trace_a.y.length > size)
          trace_a.y.pop();
        if (trace_b.y.length > size)
          trace_b.y.pop();
      }
      else if (value.substr(0, "i2caddr:".length) == "i2caddr:") {
        data = value.substr("i2caddr:".length).trim().split(separator);

        document.getElementById("i2c_addr").innerHTML="0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "cid:".length) == "cid:") {
        data = value.substr("cid:".length).trim().split(separator);

        document.getElementById("companyid").innerHTML="0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "did:".length) == "did:") {
        data = value.substr("did:".length).trim().split(separator);

        document.getElementById("deviceid").innerHTML="0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "xonoff:".length) == "xonoff:") {
        data = value.substr("xonoff:".length).trim().split(separator);

        if (data[0] == 1)
        {
          document.getElementById("mlx90394_x_check").checked=true;
        }
        else
          document.getElementById("mlx90394_x_check").checked=false;
      }
      else if (value.substr(0, "xonoff:".length) == "xonoff:") {
        data = value.substr("xonoff:".length).trim().split(separator);

        if (data[0] == 1)
        {
          document.getElementById("mlx90394_x_check").checked=true;
        }
        else
          document.getElementById("mlx90394_x_check").checked=false;
      }
      else if (value.substr(0, "yonoff:".length) == "yonoff:") {
        data = value.substr("yonoff:".length).trim().split(separator);

        if (data[0] == 1)
        {
          document.getElementById("mlx90394_y_check").checked=true;
        }
        else
          document.getElementById("mlx90394_y_check").checked=false;
      }
      else if (value.substr(0, "zonoff:".length) == "zonoff:") {
        data = value.substr("zonoff:".length).trim().split(separator);

        if (data[0] == 1)
        {
          document.getElementById("mlx90394_z_check").checked=true;
        }
        else
          document.getElementById("mlx90394_z_check").checked=false;
      }
      else if (value.substr(0, "tonoff:".length) == "tonoff:") {
        data = value.substr("tonoff:".length).trim().split(separator);

        if (data[0] == 1)
        {
          document.getElementById("mlx90394_t_check").checked=true;
        }
        else
          document.getElementById("mlx90394_t_check").checked=false;
      }
      else if (value.substr(0, "osrhall:".length) == "osrhall:") {
        data = value.substr("osrhall:".length).trim().split(separator);

        if (data[0] == 1)
        {
          document.getElementById("mlx90394_osr_hall_1").checked=true;
        }
        else
          document.getElementById("mlx90394_osr_hall_0").checked=true;
      }
      else if (value.substr(0, "osrtemp:".length) == "osrtemp:") {
        data = value.substr("osrtemp:".length).trim().split(separator);

        if (data[0] == 1)
        {
          document.getElementById("mlx90394_osr_temp_1").checked=true;
        }
        else
          document.getElementById("mlx90394_osr_temp_0").checked=true;
      }
      else if (value.substr(0, "mode:".length) == "mode:") {
        data = value.substr("mode:".length).trim().split(separator);

        document.getElementById("application_mode").value=data[0];
      }
      else if (value.substr(0, "range:".length) == "range:") {
        data = value.substr("range:".length).trim().split(separator);

        document.getElementById("range_config").value=data[0];

        if (data[0] == 0)
        {
          sensitivity = 1.5;
        }
        else if (data[0] == 1)
        {
          sensitivity = 1.5;
        }
        else if (data[0] == 2)
        {
          sensitivity = 0.15;
        }
        else if (data[0] == 3)
        {
          sensitivity = 1.5;
        }
      }
      else if (value.substr(0, "digfltxy:".length) == "digfltxy:") {
        data = value.substr("digfltxy:".length).trim().split(separator);

        document.getElementById("dig_filt_xy").value=data[0];
      }
      else if (value.substr(0, "digfltz:".length) == "digfltz:") {
        data = value.substr("digfltz:".length).trim().split(separator);

        document.getElementById("dig_filt_z").value=data[0];
      }
      else if (value.substr(0, "digflttemp:".length) == "digflttemp:") {
        data = value.substr("digflttemp:".length).trim().split(separator);

        document.getElementById("dig_filt_t").value=data[0];
      }
      else if (value.substr(0, "wocmode:".length) == "wocmode:") {
        data = value.substr("wocmode:".length).trim().split(separator);

        document.getElementById("woc_mode").value=data[0];
      }
    }

    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}

async function checkbox_fun(element) {
  var checkBox = element;
  const writer = outputStream.getWriter();

  if (checkBox.checked == true) {
    if (checkBox.id === "mlx90394_x_check")
      writer.write("mlx90394_ops_ctrl 259 1\r");
    else if (checkBox.id === "mlx90394_y_check")  
      writer.write("mlx90394_ops_ctrl 260 1\r");
    else if (checkBox.id === "mlx90394_z_check")  
      writer.write("mlx90394_ops_ctrl 261 1\r");
    else if (checkBox.id === "mlx90394_t_check")  
      writer.write("mlx90394_ops_ctrl 262 1\r");
  } 
  else {
    if (checkBox.id === "mlx90394_x_check")
      writer.write("mlx90394_ops_ctrl 259 0\r");
    else if (checkBox.id === "mlx90394_y_check")  
      writer.write("mlx90394_ops_ctrl 260 0\r");
    else if (checkBox.id === "mlx90394_z_check")  
      writer.write("mlx90394_ops_ctrl 261 0\r");
    else if (checkBox.id === "mlx90394_t_check")  
      writer.write("mlx90394_ops_ctrl 262 0\r");
  }

  writer.releaseLock();
}

async function size_onchange(element) {
  size = element.value;
}

async function formula_alpha_onchange(element) {
  formula_alpha = element.value;

  console.log(eval(formula_alpha));
}

async function formula_beta_onchange(element) {
  formula_beta = element.value;

  console.log(eval(formula_beta));
}

async function freq_onchange(element) {
  const writer = outputStream.getWriter();

  writer.write("mlx90394_set_sample_freq " + element.value + "\r");

  writer.releaseLock();
}

async function mode_onchange(element) {
  var selectIndex = element.selectedIndex;

  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_MODE 263
  writer.write("mlx90394_ops_ctrl 263 " + selectIndex + "\r");

  writer.releaseLock();
}

async function range_onchange(element) {
  var selectIndex = element.selectedIndex;

  if (selectIndex == 0)
  {
    sensitivity = 1.5;
  }
  else if (selectIndex == 1)
  {
    sensitivity = 1.5;
  }
  else if (selectIndex == 2)
  {
    sensitivity = 0.15;
  }
  else if (selectIndex == 3)
  {
    sensitivity = 1.5;
  }

  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_RANGE 264
  writer.write("mlx90394_ops_ctrl 264 " + selectIndex + "\r");

  writer.releaseLock();
}

async function filt_xy_onchange(element) {
  var selectIndex = element.selectedIndex;

  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_FILT_XY 265
  writer.write("mlx90394_ops_ctrl 265 " + selectIndex + "\r");

  writer.releaseLock();
}

async function filt_z_onchange(element) {
  var selectIndex = element.selectedIndex;

  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_FILT_Z 266
  writer.write("mlx90394_ops_ctrl 266 " + selectIndex + "\r");

  writer.releaseLock();
}

async function filt_t_onchange(element) {
  var selectIndex = element.selectedIndex;

  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_FILT_T 267
  writer.write("mlx90394_ops_ctrl 267 " + selectIndex + "\r");

  writer.releaseLock();
}

async function woc_mode_onchange(element) {
  var selectIndex = element.selectedIndex;

  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_WOC_MODE 268
  writer.write("mlx90394_ops_ctrl 268 " + selectIndex + "\r");

  writer.releaseLock();
}

async function osr_hall_onclick(element) {
  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_OSR_HALL 269
  writer.write("mlx90394_ops_ctrl 269 " + element.value + "\r");

  writer.releaseLock();
}

async function osr_temp_onclick(element) {
  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_SET_OSR_TEMP 270
  writer.write("mlx90394_ops_ctrl 270 " + element.value + "\r");

  writer.releaseLock();
}

async function connect() {
  // - Request a port and open a connection.
  port = await navigator.serial.requestPort();

  // - Wait for the port to open.toggleUIConnected
  await port.open({ baudRate: baudRate.value });

  let decoder = new TextDecoderStream();
  inputDone   = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable.pipeThrough(new TransformStream(new LineBreakTransformer()));

  const encoder = new TextEncoderStream();
  outputDone    = encoder.readable.pipeTo(port.writable);
  outputStream  = encoder.writable;

  reader = inputStream.getReader();

  prefix    = document.getElementById('messageprefixid').value
  separator = document.getElementById('messageseparatorid').value

  readLoop().catch(async function(error) {
    toggleUIConnected(false);
    await disconnect();
  });
}

async function reset() {
  // Clear the data
  log.innerHTML = "";
}

async function clickConnect() {
  if (port) {
      await disconnect();
      toggleUIConnected(false);
      return;
    }
  
    await connect();
  
    reset();
  
    toggleUIConnected(true);    
}

async function clickStart() {
  const writer = outputStream.getWriter();
    
  console.log(butStart.innerHTML);

  if (butStart.innerHTML === "Start")
  {
    writer.write("mlx90394_measurement_onoff on\r");
    butStart.innerHTML = "Stop";
  }
  else if (butStart.innerHTML === "Stop")
  {
    writer.write("mlx90394_measurement_onoff off\r");
    butStart.innerHTML = "Start";
  }

  writer.releaseLock();
}

async function clickInfo() {
  const writer = outputStream.getWriter();

  writer.write("mlx90394_ops_ctrl 258\r");

  writer.releaseLock();
}

async function clickShow() {
}

async function clickReset() {
  const writer = outputStream.getWriter();

  //RT_SENSOR_CTRL_USER_CMD_RESET 257
  writer.write("mlx90394_ops_ctrl 257\r");

  writer.releaseLock();
}

function saveSetting(setting, value) {
    window.localStorage.setItem(setting, JSON.stringify(value));
}

async function changeBaudRate() {
    saveSetting('baudrate', baudRate.value);
}

async function clickClear() {
  reset();

  document.getElementById("companyid").innerHTML = "";
  document.getElementById("deviceid").innerHTML = "";
  
  document.getElementById("mlx90394_x_check").checked = false;
  document.getElementById("mlx90394_y_check").checked = false;
  document.getElementById("mlx90394_z_check").checked = false;
  document.getElementById("mlx90394_t_check").checked = false;

  document.getElementById("application_mode").value = 0;
  document.getElementById("range_config").value = 0;
  document.getElementById("dig_filt_xy").value = 0;
  document.getElementById("dig_filt_z").value = 0;
  document.getElementById("dig_filt_t").value = 0;
  document.getElementById("woc_mode").value = 0;
}

async function clickAutoscroll() {
  saveSetting('autoscroll', autoscroll.checked);
}

async function clickTimestamp() {
  saveSetting('timestamp', showTimestamp.checked);
}

function writeCmd(event) {
  // Write to output stream
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    console.log(myInput.value);
    
    writer.write(myInput.value + '\r');
    myInput.value = ''
  }

  // Ignores sending carriage return if sending Ctrl+C
  // if (cmd !== "\x03") {
    // writer.write("\r"); // Important to send a carriage return after a command
  // }
  
  writer.releaseLock();
}

function initBaudRate() {
  for (let rate of baudRates) {
    var option = document.createElement("option");
    option.text = rate + " Baud";
    option.value = rate;
    baudRate.add(option);
  }
}

function loadSetting(setting, defaultValue) {
  let value = JSON.parse(window.localStorage.getItem(setting));

  if (value == null) {
    return defaultValue;
  }

  return value;
}

function loadAllSettings() {
  // Load all saved settings or defaults
  autoscroll.checked    = loadSetting('autoscroll', true);
  showTimestamp.checked = loadSetting('timestamp', false);
  // kalmanFilter.checked  = loadSetting('kalmanfilter', false);
  baudRate.value        = loadSetting('baudrate', 115200);
  // darkMode.checked      = loadSetting('darkmode', false);
}

document.addEventListener('DOMContentLoaded', async () => {
  butConnect.addEventListener('click', clickConnect);
  baudRate.addEventListener('change', changeBaudRate);
  autoscroll.addEventListener('click', clickAutoscroll);
  showTimestamp.addEventListener('click', clickTimestamp);
  baudRate.addEventListener('change', changeBaudRate);
  myInput.addEventListener('keydown', writeCmd);

  if ('serial' in navigator) {
    console.log("webserial is supported!")
  }
  else
    console.log("webserial is not supported!")

  Plotly.newPlot('plot', data_xyz, layout_xyz, config);
  plots.push('plot');    

  Plotly.newPlot('plot_ab', data_ab, layout_ab, config);

  size = document.getElementById("sampleSize").value;

  formula_alpha = document.getElementById("formula_alpha").value;
  formula_beta  = document.getElementById("formula_beta").value;

  initBaudRate();
  loadAllSettings();
});  

var j = function(p)
{
  let width = 400;

  /** The maximum stick deflection angle, in radians */
  const MAX_DEFLECT = Math.PI / 8;

  p.setup = function() 
  {
    // p.createCanvas((joystick_card.offsetWidth), (joystick_card.offsetHeight), p.WEBGL);
    p.createCanvas((log.offsetWidth), (log.offsetHeight), p.WEBGL);
  }

  p.draw = function() 
  {
    const stickLen = width * 0.3;

    // p.background(0xFF, 0xFF, 0xFF);
    p.background('rgba(255, 255, 255, 0.2)')

    p.ambientLight(128);
    p.directionalLight(200, 200, 200, 100, 150, -1);  // A white light from behind the viewer
    p.ambientMaterial(192);

    p.sphere(60);

    p.rotateX(-Math.PI / 2);

    p.rotateX(p.map(beta-90, -25, 25, -MAX_DEFLECT, MAX_DEFLECT));
    p.rotateZ(p.map(alpha-90, -25, 25, -MAX_DEFLECT, MAX_DEFLECT));

    // rotateY(map(mouseXRatio(), -1, 1, -MAX_DEFLECT, MAX_DEFLECT));

    p.translate(0, -stickLen / 2, 0);
    p.noStroke();

    p.cylinder(stickLen / 7, stickLen);
  }

  p.windowResized = function() 
  {
      p.resizeCanvas((joystick_card.offsetWidth, joystick_card.offsetHeight));
      p.redraw();
      
      // p.setup();

    // if (grid.offsetWidth + 20 > 768)
    // {
    //   p.resizeCanvas((grid.offsetWidth-10)/2, (grid.offsetHeight-30)/2);
    // }
    // else
    // {
    //   console.log(grid.offsetWidth);
    //   console.log(grid.offsetHeight/3);
    //   p.resizeCanvas((grid.offsetWidth, grid.offsetHeight/3));
    // }
  }
}

var myp5 = new p5(j, 'joystick');

var ab_meter = function(p)
{
  p.setup = function() 
  {
    p.createCanvas((log.offsetWidth), (log.offsetHeight));
    p.angleMode(p.DEGREES);

    p.textSize(20);
  }

  p.draw = function() 
  {
    p.background(0xF0, 0xF0, 0xF0)
    p.translate(p.width/2, p.height/2);
    p.rotate(-90);
  
    p.strokeWeight(8);
    p.stroke(219, 65, 64);
    // p.stroke(255, 100, 150);
    p.noFill();
  
    // let secondAngle = p.map(sc, 0, 60, 0, 360);
    // p.arc(0, 0, 300, 300, 0, degree);  //degree
    p.arc(0, 0, 300, 300, 0, alpha); 

    p.stroke(101, 187, 169);
    // p.stroke(150, 100, 255);
    // let minuteAngle = p.map(mn, 0, 60, 0, 360);
    // p.arc(0, 0, 280, 280, 0, minuteAngle);
    p.arc(0, 0, 280, 280, 0, beta);

    p.push();
    p.rotate(alpha);
    p.stroke(219, 65, 64);
    // p.stroke(255, 100, 150);
    p.line(0, 0, 100, 0);
    p.pop();

    p.push();
    p.rotate(beta);
    p.stroke(101, 187, 169);
    // p.stroke(150, 100, 255);
    p.line(0, 0, 75, 0);
    p.pop();

    // Tick markers around perimeter of clock
    p.push();
    p.stroke(255, 255, 255);
    p.strokeWeight(4);
    for (let ticks = 0; ticks < 60; ticks += 1) 
    {
      p.point(0, 160);
      p.rotate(6);
    }
    p.pop();
    
    p.push();
    p.resetMatrix();

    p.noStroke();
    p.textSize(14);

    p.fill(219, 65, 64);
    p.text("Alpha： " + alpha + "°", 10, 10, 300, 200);

    p.fill(101, 187, 169);
    p.text("Beta： "  + beta  + "°", 10, 30, 300, 200);
    
    p.pop();    
  }

  p.windowResized = function() 
  {
      p.setup();
  }
}
var ab_meter_obj = new p5(ab_meter, 'alphabeta');
