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

// let plots = [];

let x = 0;
let y = 0;
let z = 0;
let second_kalman = 0;
let t = 0;
let ssia = 0;
let ssib = 0;
let speed = 0;
let current_pos = 0;

let size = 300;

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
    text: 'plot angle',
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
    title: 'angle °',
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
  name: 'degree',
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
  name: 'minute',
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
  name: 'second',
  line: {
    color: 'rgb(219, 65, 64)',
    width: 1
  }
};

let trace_second_kalman = {
  y: [0],
  mode: 'lines',
  name: 'second_kalman',
  line: {
    color: 'rgb(234, 8, 241)',
    width: 1
  }
};

let data_xyz = [trace_x, trace_y, trace_z, trace_second_kalman];

let layout_speed = {
  autosize: true,
  // margin: { t: 5, b: 5, l: 5, r: 5 },

  title: {
    text: 'plot speed',
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
    title: 'speed',
    showline: false
  },  

  plot_bgcolor: 'rgba(255, 255, 255, 0)', // 设置图表背景透明
  paper_bgcolor: 'rgba(255, 255, 255, 0)', // 设置画布背景透明  
};

let trace_speed = {
  // type: 'scattergl',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'speed',
  line: {
    color: 'rgb(219, 65, 64)',
    width: 1
  }
};

let data_speed = [trace_speed];

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
const steps         = document.getElementById('steps');
const speedMotor    = document.getElementById('speedMotor');
const moveToPos     = document.getElementById('moveToPos');
const butCCW        = document.getElementById('butCCW');
const butCW         = document.getElementById('butCW');
const butHome       = document.getElementById('butHome');
const butSetZero    = document.getElementById('butSetZero');
const butStop       = document.getElementById('butStop');
const butStart      = document.getElementById('butStart');
const butInfo       = document.getElementById('butInfo');
const butSave       = document.getElementById('butSave');
const butReset      = document.getElementById('butReset');
const ver_cfg       = document.getElementById('ver_cfg');
const ver_vdp       = document.getElementById('ver_vdp');
const ver_vds       = document.getElementById('ver_vds');
const ver_vm        = document.getElementById('ver_vm');
const fc1_cfg       = document.getElementById('fc1_cfg');
const fc2_cfg       = document.getElementById('fc2_cfg');

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
        x = data[0];  //degree
        y = data[1];  //minute
        z = data[2];  //second
        second_kalman = data[3]
        t = data[4];
        ssia = data[5];
        ssib = data[6];
        speed = data[7];
        current_pos = data[8];

        // console.log(value.substr(prefix.length).trim());
        // obj = JSON.parse(value.substr(prefix.length).trim());
        // x = obj.degree;
        // y = obj.minute;
        // z = obj.second;
        // t = obj.temp;
        // speed = obj.temp;

        Plotly.extendTraces(plot, {y:[[x], [y], [z], [second_kalman]]}, [0, 1, 2, 3], size);
        Plotly.extendTraces(plot_speed, {y:[[speed]]}, [0], size);

        document.getElementById("ssia").value = ssia;
        document.getElementById("ssib").value = ssib;
        
        document.getElementById("currentPos").value = current_pos;

        if (trace_x.y.length > size)
          trace_x.y.pop();
        if (trace_y.y.length > size)
          trace_y.y.pop();
        if (trace_z.y.length > size)
          trace_z.y.pop();
        if (trace_second_kalman.y.length > size)
          trace_second_kalman.y.pop();

        if (trace_speed.y.length > size)
          trace_speed.y.pop();
      }
      else if (value.substr(0, "config:".length) == "config:") {
        data = value.substr("config:".length).trim().split(separator);

        let config = data[0];
        document.getElementById("gpioProtocol").value = (parseInt(config, 16) >>3 ) & 0x3;
        document.getElementById("gpioConfig").value   = (parseInt(config, 16) >>9 ) & 0x3;
        document.getElementById("abiProtocol").value  = (parseInt(config, 16) >>5 ) & 0x1;
        document.getElementById("abiConfig").value    = (parseInt(config, 16) >>14 ) & 0x3;
      }
      else if (value.substr(0, "aversion:".length) == "aversion:") {
        data = value.substr("aversion:".length).trim().split(separator);

        document.getElementById("analog_version").innerHTML="0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "dversion:".length) == "dversion:") {
        data = value.substr("dversion:".length).trim().split(separator);

        document.getElementById("digital_version").innerHTML="MLX" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "ver_cfg:".length) == "ver_cfg:") {
        data = value.substr("ver_cfg:".length).trim().split(separator);

        document.getElementById("ver_cfg").value = data[0];
      }
      else if (value.substr(0, "ver_vdp:".length) == "ver_vdp:") {
        data = value.substr("ver_vdp:".length).trim().split(separator);

        document.getElementById("ver_vdp").value = data[0];
      }
      else if (value.substr(0, "ver_vds:".length) == "ver_vds:") {
        data = value.substr("ver_vds:".length).trim().split(separator);

        document.getElementById("ver_vds").value = data[0];
      }
      else if (value.substr(0, "ver_vm:".length) == "ver_vm:") {
        data = value.substr("ver_vm:".length).trim().split(separator);

        document.getElementById("ver_vm").value=data[0];
      }
      else if (value.substr(0, "fc1_cfg:".length) == "fc1_cfg:") {
        data = value.substr("fc1_cfg:".length).trim().split(separator);

        document.getElementById("fc1_cfg").value = data[0];
      }
      else if (value.substr(0, "fc2_cfg:".length) == "fc2_cfg:") {
        data = value.substr("fc2_cfg:".length).trim().split(separator);

        document.getElementById("fc2_cfg").value = data[0];
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

async function changeMotorSpeed() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SET_MOTOR_S " + speedMotor.value + '\r');

  writer.releaseLock();
}

function changeMoveToPos(event) {
  // Write to output stream
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("MOVE_TO " + moveToPos.value + '\r');
  }

  writer.releaseLock();
}

async function clickCCW() {
  const writer = outputStream.getWriter();
    
  console.log(butCCW.innerHTML);

  writer.write("MOTOR_CCW " + speedMotor.value + ',' + steps.value + '\r');

  writer.releaseLock();
}

async function clickCW() {
  // Write to output stream
  const writer = outputStream.getWriter();

  console.log(steps.value);

  writer.write("MOTOR_CW " + speedMotor.value + ',' + steps.value + '\r');

  writer.releaseLock();
}

async function clickButHome() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("MOTOR_HOME 1\r");

  writer.releaseLock();
}

async function clickButSetZero() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("MOTOR_SET_ZERO 1\r");

  writer.releaseLock();
}

async function clickStop() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("MOTOR_STOP 1\r");

  writer.releaseLock();
}

async function clickStart() {
  const writer = outputStream.getWriter();
    
  console.log(butStart.innerHTML);

  if (butStart.innerHTML === "Start")
  {
    writer.write("START 1\r");
    butStart.innerHTML = "Stop";
  }
  else if (butStart.innerHTML === "Stop")
  {
    writer.write("START 0\r");
    butStart.innerHTML = "Start";
  }

  writer.releaseLock();
}

async function clickInfo() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("INFO all\r");

  writer.releaseLock();
}

async function clickSave() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SAVE all\r");

  writer.releaseLock();
}

async function clickReset() {
  const writer = outputStream.getWriter();

  writer.write("RESET all\r");

  writer.releaseLock();
}

function saveSetting(setting, value) {
    window.localStorage.setItem(setting, JSON.stringify(value));
}

async function changeBaudRate() {
    saveSetting('baudrate', baudRate.value);
}

async function changeSampleFreq() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SET_FREQ " + sampleFreq.value + '\r');

  writer.releaseLock();
}

async function change_ver_cfg() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SET_VER_CFG " + ver_cfg.value + '\r');

  writer.releaseLock();
}

async function set_ver_vdp() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SET_VER_VDP " + ver_vdp.value + '\r');

  writer.releaseLock();
}

async function set_ver_vds() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SET_VER_VDS " + ver_vds.value + '\r');

  writer.releaseLock();
}

function set_ver_vm(event) {
  // Write to output stream
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("SET_VER_VM " + ver_vm.value + '\r');
  }

  writer.releaseLock();
}

async function change_fc1_cfg() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SET_FC1_CFG " + fc1_cfg.value + '\r');

  writer.releaseLock();
}

async function change_fc2_cfg() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("SET_FC2_CFG " + fc2_cfg.value + '\r');

  writer.releaseLock();
}

async function clickClear() {
  reset();

  document.getElementById("analog_version").innerHTML = "";
  document.getElementById("digital_version").innerHTML = "";
  
  document.getElementById("ver_vdp").value = "";
  document.getElementById("ver_vds").value = "";
  document.getElementById("ver_vm").value = "";
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
  speedMotor.addEventListener('change', changeMotorSpeed);
  moveToPos.addEventListener('keydown', changeMoveToPos);
  butCCW.addEventListener('click', clickCCW);
  butCW.addEventListener('click', clickCW);
  butHome.addEventListener('click', clickButHome);
  butSetZero.addEventListener('click', clickButSetZero);
  butStop.addEventListener('click', clickStop);
  butStart.addEventListener('click', clickStart);
  butInfo.addEventListener('click', clickInfo);
  butSave.addEventListener('click', clickSave);
  butReset.addEventListener('click', clickReset);
  sampleFreq.addEventListener('change', changeSampleFreq);
  ver_cfg.addEventListener('change', change_ver_cfg);
  ver_vdp.addEventListener('keydown', set_ver_vdp);
  ver_vds.addEventListener('keydown', set_ver_vds);
  ver_vm.addEventListener('keydown', set_ver_vm);
  fc1_cfg.addEventListener('change', change_fc1_cfg);
  fc2_cfg.addEventListener('change', change_fc2_cfg);

  if ('serial' in navigator) {
    console.log("webserial is supported!")
  }
  else
    console.log("webserial is not supported!")

  Plotly.newPlot('plot', data_xyz, layout_xyz, config);
  Plotly.newPlot('plot_speed', data_speed, layout_speed, config);
  // plots.push('plot');    

  initBaudRate();
  loadAllSettings();
});  

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
    
    p.strokeWeight(8);
    
    p.noFill();

    p.stroke(219, 65, 64);
    let secondAngle = p.map(z, 0, 60, 0, 360);
    // p.arc(0, 0, 300, 300, 0, degree);  //degree
    p.arc(0, 0, 300, 300, 0, secondAngle); 

    p.stroke(101, 187, 169);
    let minuteAngle = p.map(y, 0, 60, 0, 360);
    p.arc(0, 0, 280, 280, 0, minuteAngle);
  
    p.stroke(0, 53, 75);
    // p.stroke(150, 255, 100);
    // let secondAngle = p.map(sc, 0, 60, 0, 360);
    // p.arc(0, 0, 260, 260, 0, secondAngle);
    p.arc(0, 0, 260, 260, 0, x);

    p.push();
    p.rotate(secondAngle);
    p.stroke(219, 65, 64);
    p.line(0, 0, 100, 0);
    p.pop();
  
    p.push();
    p.rotate(minuteAngle);
    p.stroke(101, 187, 169);
    p.line(0, 0, 75, 0);
    p.pop();
  
    p.push();
    p.rotate(x);
    p.stroke(0, 53, 75);
    p.line(0, 0, 50, 0);
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

    p.fill(0, 53, 75);
    // p.fill(255, 100, 150);
    p.text("Degree： " + x + "°", 10, 10, 300, 200);
    
    p.fill(101, 187, 169);
    // p.fill(150, 100, 255);
    p.text("Minute： " + y + "\"", 10, 30, 300, 200);

    p.fill(219, 65, 64);
    // p.fill(150, 255, 100);
    p.text("Second： " + z + "\'", 10, 50, 300, 200);

    p.fill('limegreen');
    p.text("Temperature： " + t + "°", 10, 70, 300, 200);
    p.pop();
  }

  p.windowResized = function() 
  {
      p.setup();
  }
}
var meter_obj = new p5(meter, 'meter');

var speed_meter = function(p)
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
    p.arc(0, 0, 300, 300, 0, speed); 

    p.push();
    p.rotate(speed);
    p.stroke(219, 65, 64);
    // p.stroke(255, 100, 150);
    p.line(0, 0, 100, 0);
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
    // p.fill(255, 100, 150);
    p.text("SPEED： " + speed, 10, 10, 300, 200);
    
    p.pop();    
  }

  p.windowResized = function() 
  {
      p.setup();
  }
}
var speed_meter_obj = new p5(speed_meter, 'speed_meter');
