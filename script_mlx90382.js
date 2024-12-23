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
let t = 0;
let speed = 0;

let alpha = 0;
let beta  = 0;

let size = 300;
let freq = 10;

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
    text: 'plot all the data',
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
    title: 'value',
    showline: false
  },  

  plot_bgcolor: 'rgba(255, 255, 255, 0)', // 设置图表背景透明
  paper_bgcolor: 'rgba(255, 255, 255, 0)', // 设置画布背景透明  
  // plot_bgcolor: 'rgba(178, 196, 203, 0)', // 设置图表背景透明
  // paper_bgcolor: 'rgba(178, 196, 203, 0.8)', // 设置画布背景透明  

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

const log           = document.getElementById('log');
const joystick      = document.getElementById('joystick');
const butConnect    = document.getElementById('butConnect');
const butClear      = document.getElementById('butClear');
const baudRate      = document.getElementById('baudRate');
const autoscroll    = document.getElementById('autoscroll');
const showTimestamp = document.getElementById('showTimestamp');
const myInput       = document.getElementById('myInput');
const sampleSize    = document.getElementById('sampleSize');
const sampleFreq    = document.getElementById('sampleFreq');

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

        x = data[0];
        y = data[1];
        z = data[2];
        t = data[3];
        speed = data[4]
    
        for (let i = 0; i < plots.length; i++)
        {
          Plotly.extendTraces(plots[i], {y:[[x], [y], [z]]}, [0, 1, 2], size);
        }
    
        if (trace_x.y.length > size)
          trace_x.y.pop();
        if (trace_y.y.length > size)
          trace_y.y.pop();
        if (trace_z.y.length > size)
          trace_z.y.pop();
      }

      if (value.substr(0, "config:".length) == "config:") {
        data = value.substr("config:".length).trim().split(separator);
        document.getElementById("analog_version").innerHTML="0x" + data[0].toString(16).toUpperCase();
        document.getElementById("digital_version").innerHTML="0x" + data[1].toString(16).toUpperCase();
        document.getElementById("zero_position").value="0x" + data[2].toString(16).toUpperCase();
      }
    }

    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
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

function saveSetting(setting, value) {
    window.localStorage.setItem(setting, JSON.stringify(value));
}

async function changeBaudRate() {
    saveSetting('baudrate', baudRate.value);
}

async function clickClear() {
  reset();
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
  butClear.addEventListener('click', clickClear);
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

  initBaudRate();
  loadAllSettings();
});  

// var temperature = function(p)
// {
//   var h = 0;
//   var t0 = 0;

//   p.setup = function() 
//   {
//     p.createCanvas((log.offsetWidth), (log.offsetHeight));

//     p.textSize(20);
//   }

//   p.draw = function() 
//   {
//     p.background(0xF0, 0xF0, 0xF0)

//     h = p.map(t, -10, 100, 60, 300);
//     p.fill('#ff6000');
//     p.noStroke();
//     p.rect(192, 300, 16, t0);
//     if (t0 >= -h) {
//       t0--;
//     }

//     p.fill('limegreen');
//     p.text("temperature is " + t + " °", 50, 50);
//   }

//   p.windowResized = function() 
//   {
//     p.setup();
//   }
// }
// var mytemperature = new p5(temperature, 'temperature');

var meter = function(p)
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
  
    // let degree = parseInt(x);
    // let mn = parseInt((x-degree)*60);
    // let sc = ((x-degree)*60 - parseInt((x-degree)*60))*60;
  
    p.strokeWeight(8);
    p.stroke(255, 100, 150);
    p.noFill();
    // let secondAngle = p.map(sc, 0, 60, 0, 360);
    // p.arc(0, 0, 300, 300, 0, degree);  //degree
    p.arc(0, 0, 300, 300, 0, x); 

    p.stroke(150, 100, 255);
    // let minuteAngle = p.map(mn, 0, 60, 0, 360);
    // p.arc(0, 0, 280, 280, 0, minuteAngle);
    p.arc(0, 0, 280, 280, 0, y);
  
    p.stroke(150, 255, 100);
    // let secondAngle = p.map(sc, 0, 60, 0, 360);
    // p.arc(0, 0, 260, 260, 0, secondAngle);
    p.arc(0, 0, 260, 260, 0, z);

    p.arc(0, 0, 240, 240, 0, speed);
  
    p.push();
    p.rotate(x);
    p.stroke(255, 100, 150);
    p.line(0, 0, 100, 0);
    p.pop();
  
    p.push();
    p.rotate(y);
    p.stroke(150, 100, 255);
    p.line(0, 0, 75, 0);
    p.pop();
  
    p.push();
    p.rotate(z);
    p.stroke(150, 255, 100);
    p.line(0, 0, 50, 0);
    p.pop();

    p.push();
    p.rotate(speed);
    p.stroke(150, 255, 100);
    p.line(0, 0, 25, 0);
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
    p.translate(0, 0);
    p.rotate(90);
    p.fill(255, 100, 150);
    p.text("angle is " + x, 140, 120, 200, 200);
    
    p.fill('limegreen');
    p.text("temperature is " + t + " °", 140, 150, 250, 200);
    p.pop();

    // p.stroke(255);
  }

  p.windowResized = function() 
  {
      p.setup();
  }
}
var meter_obj = new p5(meter, 'meter');
