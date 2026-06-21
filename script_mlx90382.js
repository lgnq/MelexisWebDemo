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
let t = 0;
let speed = 0;

let alpha = 0;
let beta  = 0;

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
  name: 'phase_lin',
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
  name: 'phase_driftc',
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
  name: 'phase_sc',
  line: {
    color: 'rgb(219, 65, 64)',
    width: 1
  }
};

let data_xyz = [trace_x, trace_y, trace_z];

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
const butStart      = document.getElementById('butStart');
const butInfo       = document.getElementById('butInfo');
const butReset      = document.getElementById('butReset');
const butNvram      = document.getElementById('butNvram');
const zeroposition  = document.getElementById('zero_position');
const sensingMode  = document.getElementById('sensingMode');
const gpioProtocol = document.getElementById('gpioProtocol');

const de_aroc      = document.getElementById('de_aroc');
const de_sr        = document.getElementById('de_sr');
const de_die       = document.getElementById('de_die');
const de_intp      = document.getElementById('de_intp');
const de_scxy      = document.getElementById('de_scxy');

const er_aroc      = document.getElementById("er_aroc");
const er_dst       = document.getElementById("er_dsp");
const er_dsp_ta    = document.getElementById("er_dsp_ta");
const er_dsp_alf   = document.getElementById("er_dsp_alf");
const er_afe_ref   = document.getElementById("er_afe_ref");
const er_adc_lin   = document.getElementById("er_adc_lin");
const er_adc       = document.getElementById("er_adc");
const er_agc_lo    = document.getElementById("er_agc_lo");
const er_agc_hi    = document.getElementById("er_agc_hi");
const er_speed_hi  = document.getElementById("er_speed_hi");
const er_temp_lo   = document.getElementById("er_temp_lo");
const er_temp_hi   = document.getElementById("er_temp_hi");
const er_nvm_sr    = document.getElementById("er_nvm_sr");
const er_ov_vdda   = document.getElementById("er_ov_vdda");
const er_ov_vddd   = document.getElementById("er_ov_vddd");
const er_ov_vaux   = document.getElementById("er_ov_vaux");

const er_nvm_ded   = document.getElementById("er_nvm_ded");
const er_nvm_crc   = document.getElementById("er_nvm_crc");
const er_uv_vdd    = document.getElementById("er_uv_vdd");
const er_uv_vdda   = document.getElementById("er_uv_vdda");
const er_uv_vaux   = document.getElementById("er_uv_vaux");
const er_temp_max  = document.getElementById("er_temp_max");
const er_die       = document.getElementById("er_die");
const er_intp      = document.getElementById("er_intp");
const er_scxy      = document.getElementById("er_scxy");

const diag_dsp      = document.getElementById("diag_dsp");
const diag_agc_lo   = document.getElementById("diag_agc_lo");
const diag_agc_hi   = document.getElementById("diag_agc_hi");
const diag_dsp_ta   = document.getElementById("diag_dsp_ta");
const diag_speed_hi = document.getElementById("diag_speed_hi");
const diag_temp_lo  = document.getElementById("diag_temp_lo");
const diag_temp_hi  = document.getElementById("diag_temp_hi");
const diag_mem      = document.getElementById("diag_mem");
const diag_amp_adc  = document.getElementById("diag_amp_adc");

const sc_x1  = document.getElementById("sc_x1");
const sc_x2  = document.getElementById("sc_x2");
const sc_y1  = document.getElementById("sc_y1");
const sc_y2  = document.getElementById("sc_y2");
const sc_ye  = document.getElementById("sc_ye");
const sc_hl  = document.getElementById("sc_hl");

const faddr0  = document.getElementById("faddr0");
const faddr1  = document.getElementById("faddr1");
const faddr2  = document.getElementById("faddr2");
const faddr3  = document.getElementById("faddr3");

const frfs    = document.getElementById("frfs");
const frfsen  = document.getElementById("frfsen");
const frcrcen = document.getElementById("frcrcen");
const frinv   = document.getElementById("frinv");

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

        x = data[0];  //lin_phase
        y = data[1];  //driftc_phase
        z = data[2];  //sc_phase
        speed = data[3];
        t = data[4];
    
        // for (let i = 0; i < plots.length; i++)
        // {
        //   Plotly.extendTraces(plots[i], {y:[[x], [y], [z]]}, [0, 1, 2], size);
        // }

        Plotly.extendTraces(plot, {y:[[x], [y], [z]]}, [0, 1, 2], size);
        Plotly.extendTraces(plot_speed, {y:[[speed]]}, [0], size);

        if (trace_x.y.length > size)
          trace_x.y.pop();
        if (trace_y.y.length > size)
          trace_y.y.pop();
        if (trace_z.y.length > size)
          trace_z.y.pop();

        if (trace_speed.y.length > size)
          trace_speed.y.pop();
      }
      else if (value.substr(0, "config:".length) == "config:") {
        data = value.substr("config:".length).trim().split(separator);

        let config = data[0];
        document.getElementById("sensingMode").value = (parseInt(config, 16) ) & 0x3;
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

        document.getElementById("digital_version").innerHTML="0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "zeroposition:".length) == "zeroposition:") {
        data = value.substr("zeroposition:".length).trim().split(separator);

        document.getElementById("zero_position").value="0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "sc_x1:".length) == "sc_x1:") {
        data = value.substr("sc_x1:".length).trim().split(separator);

        sc_x1.value = "0x" + data[0].toString(16).toUpperCase();
      }      
      else if (value.substr(0, "sc_x2:".length) == "sc_x2:") {
        data = value.substr("sc_x2:".length).trim().split(separator);

        sc_x2.value = "0x" + data[0].toString(16).toUpperCase();
      }            
      else if (value.substr(0, "sc_y1:".length) == "sc_y1:") {
        data = value.substr("sc_y1:".length).trim().split(separator);

        sc_y1.value = "0x" + data[0].toString(16).toUpperCase();
      }      
      else if (value.substr(0, "sc_y2:".length) == "sc_y2:") {
        data = value.substr("sc_y2:".length).trim().split(separator);

        sc_y2.value = "0x" + data[0].toString(16).toUpperCase();
      }            
      else if (value.substr(0, "sc_ye:".length) == "sc_ye:") {
        data = value.substr("sc_ye:".length).trim().split(separator);

        sc_ye.value = "0x" + data[0].toString(16).toUpperCase();
      }      
      else if (value.substr(0, "sc_hl:".length) == "sc_hl:") {
        data = value.substr("sc_hl:".length).trim().split(separator);

        sc_hl.value = "0x" + data[0].toString(16).toUpperCase();
      }                        
      else if (value.substr(0, "faddr0:".length) == "faddr0:") {
        data = value.substr("faddr0:".length).trim().split(separator);

        faddr0.value = "0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "faddr1:".length) == "faddr1:") {
        data = value.substr("faddr1:".length).trim().split(separator);

        faddr1.value = "0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "faddr2:".length) == "faddr2:") {
        data = value.substr("faddr2:".length).trim().split(separator);

        faddr2.value = "0x" + data[0].toString(16).toUpperCase();
      }
      else if (value.substr(0, "faddr3:".length) == "faddr3:") {
        data = value.substr("faddr3:".length).trim().split(separator);

        faddr3.value = "0x" + data[0].toString(16).toUpperCase();
      }                  
      else if (value.substr(0, "ram_0xbe:".length) == "ram_0xbe:") {
        data = value.substr("ram_0xbe:".length).trim().split(separator);

        let ram_0xbe = parseInt(data[0], 16);

        de_aroc.checked = (ram_0xbe & 0x1) ? true : false;          
        de_sr.checked   = (((ram_0xbe >> 1) & 0x7) == 3) ? false : true;          
        de_die.checked  = ((ram_0xbe >> 4) & 0x1) ? true : false;          
        de_intp.checked = ((ram_0xbe >> 5) & 0x1) ? true : false;          
        de_scxy.checked = ((ram_0xbe >> 6) & 0x1) ? true : false;          
      }
      else if (value.substr(0, "diag1:".length) == "diag1:") {
        data = value.substr("diag1:".length).trim().split(separator);

        let diag1 = parseInt(data[0], 16);
        er_aroc.checked      = ((diag1) & 0x1) ? true : false;
        er_dsp.checked       = ((diag1 >> 1) & 0x1) ? true : false;
        er_dsp_ta.checked    = ((diag1 >> 2) & 0x1) ? true : false;
        er_dsp_alf.checked   = ((diag1 >> 3) & 0x1) ? true : false;
        er_afe_ref.checked   = ((diag1 >> 4) & 0x1) ? true : false;
        er_adc_lin.checked   = ((diag1 >> 5) & 0x1) ? true : false;
        er_adc.checked       = ((diag1 >> 6) & 0x1) ? true : false;
        er_agc_lo.checked    = ((diag1 >> 7) & 0x1) ? true : false;
        er_agc_hi.checked    = ((diag1 >> 8) & 0x1) ? true : false;
        er_speed_hi.checked  = ((diag1 >> 9) & 0x1) ? true : false;
        er_temp_lo.checked   = ((diag1 >> 10) & 0x1) ? true : false;
        er_temp_hi.checked   = ((diag1 >> 11) & 0x1) ? true : false;
        er_nvm_sr.checked    = ((diag1 >> 12) & 0x1) ? true : false;
        er_ov_vdda.checked   = ((diag1 >> 13) & 0x1) ? true : false;
        er_ov_vddd.checked   = ((diag1 >> 14) & 0x1) ? true : false;
        er_ov_vaux.checked   = ((diag1 >> 15) & 0x1) ? true : false;
      }            
      else if (value.substr(0, "diag2:".length) == "diag2:") {
        data = value.substr("diag2:".length).trim().split(separator);

        let diag2 = parseInt(data[0], 16);
        er_nvm_ded.checked   = ((diag2 >> 1) & 0x1) ? true : false;
        er_nvm_crc.checked   = ((diag2 >> 2) & 0x1) ? true : false;
        er_uv_vdd.checked    = ((diag2 >> 3) & 0x1) ? true : false;
        er_uv_vdda.checked   = ((diag2 >> 4) & 0x1) ? true : false;
        er_uv_vaux.checked   = ((diag2 >> 5) & 0x1) ? true : false;
        er_temp_max.checked  = ((diag2 >> 6) & 0x1) ? true : false;
        er_die.checked       = ((diag2 >> 7) & 0x1) ? true : false;
        er_intp.checked      = ((diag2 >> 8) & 0x1) ? true : false;
        er_scxy.checked      = ((diag2 >> 9) & 0x1) ? true : false;
      }                  
      else if (value.substr(0, "diag3:".length) == "diag3:") {
        data = value.substr("diag3:".length).trim().split(separator);

        let diag3 = parseInt(data[0], 16);
        diag_dsp.checked       = ((diag3) & 0x1) ? true : false;
        diag_agc_lo.checked    = ((diag3 >> 1) & 0x1) ? true : false;
        diag_agc_hi.checked    = ((diag3 >> 2) & 0x1) ? true : false;
        diag_dsp_ta.checked    = ((diag3 >> 3) & 0x1) ? true : false;
        diag_speed_hi.checked  = ((diag3 >> 4) & 0x1) ? true : false;
        diag_temp_lo.checked   = ((diag3 >> 5) & 0x1) ? true : false;
        diag_temp_hi.checked   = ((diag3 >> 6) & 0x1) ? true : false;
        diag_mem.checked       = ((diag3 >> 7) & 0x1) ? true : false;
        diag_amp_adc.checked   = ((diag3 >> 8) & 0x8) ? true : false;
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

async function clickStart() {
  const writer = outputStream.getWriter();
    
  console.log(butStart.innerHTML);

  if (butStart.innerHTML === "Start")
  {
    writer.write("mlx90382_measurement_onoff on\r");
    butStart.innerHTML = "Stop";
  }
  else if (butStart.innerHTML === "Stop")
  {
    writer.write("mlx90382_measurement_onoff off\r");
    butStart.innerHTML = "Start";
  }

  writer.releaseLock();
}

async function clickInfo() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 258\r");

  writer.releaseLock();
}

async function clickReset() {
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 257\r");

  writer.releaseLock();
}

async function clickNvram() {
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 257\r");

  writer.releaseLock();
}

function set_zero_position(event) {
  // Write to output stream
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + zeroposition.value + '\r'); //RT_SENSOR_CTRL_USER_CMD_SET_ZEROPOSITION = 265
    // zeroposition.value = ''
  }

  writer.releaseLock();
}

function set_sc_x1(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + sc_x1.value + '\r');
  }

  writer.releaseLock();
}

function set_sc_x2(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + sc_x2.value + '\r');
  }

  writer.releaseLock();
}

function set_sc_y1(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + sc_y1.value + '\r');
  }

  writer.releaseLock();
}

function set_sc_y2(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + sc_y2.value + '\r');
  }

  writer.releaseLock();
}

function set_sc_ye(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + sc_ye.value + '\r');
  }

  writer.releaseLock();
}

function set_sc_hl(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + sc_hl.value + '\r');
  }

  writer.releaseLock();
}

function set_faddr0(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + faddr0.value + '\r');
  }

  writer.releaseLock();
}

function set_faddr1(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + faddr1.value + '\r');
  }

  writer.releaseLock();
}

function set_faddr2(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + faddr2.value + '\r');
  }

  writer.releaseLock();
}

function set_faddr3(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + faddr3.value + '\r');
  }

  writer.releaseLock();
}

function set_frfs(event) {
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    writer.write("mlx90382_ops_ctrl 265 " + frfs.value + '\r');
  }

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

  writer.write("mlx90382_set_sample_freq " + sampleFreq.value + '\r');

  writer.releaseLock();
}

async function changeSensingMode() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 266 " + sensingMode.value + '\r');

  writer.releaseLock();
}

async function changeGpioProtocol() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 267 " + gpioProtocol.value + '\r');

  writer.releaseLock();
}

async function clickClear() {
  reset();

  document.getElementById("analog_version").innerHTML = "";
  document.getElementById("digital_version").innerHTML = "";
}

async function click_de_aroc() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 267 " + gpioProtocol.value + '\r');

  writer.releaseLock();  
}

async function click_de_sr() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 267 " + gpioProtocol.value + '\r');

  writer.releaseLock();  
}

async function click_de_die() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 267 " + gpioProtocol.value + '\r');

  writer.releaseLock();  
}

async function click_de_intp() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 267 " + gpioProtocol.value + '\r');

  writer.releaseLock();  
}

async function click_de_scxy() {
  // Write to output stream
  const writer = outputStream.getWriter();

  writer.write("mlx90382_ops_ctrl 267 " + gpioProtocol.value + '\r');

  writer.releaseLock();  
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
  butStart.addEventListener('click', clickStart);
  butInfo.addEventListener('click', clickInfo);
  butReset.addEventListener('click', clickReset);
  butNvram.addEventListener('click', clickNvram);
  zeroposition.addEventListener('keydown', set_zero_position);
  sampleFreq.addEventListener('change', changeSampleFreq);
  sensingMode.addEventListener('change', changeSensingMode);
  gpioProtocol.addEventListener('change', changeGpioProtocol);
  de_aroc.addEventListener('click', click_de_aroc);
  de_sr.addEventListener('click', click_de_sr);
  de_die.addEventListener('click', click_de_die);
  de_intp.addEventListener('click', click_de_intp);
  de_scxy.addEventListener('click', click_de_scxy);

  sc_x1.addEventListener('keydown', set_sc_x1);  
  sc_x2.addEventListener('keydown', set_sc_x2);  
  sc_y1.addEventListener('keydown', set_sc_y1);  
  sc_y2.addEventListener('keydown', set_sc_y2);  
  sc_ye.addEventListener('keydown', set_sc_ye);  
  sc_hl.addEventListener('keydown', set_sc_hl); 
  
  faddr0.addEventListener('keydown', set_faddr0);  
  faddr1.addEventListener('keydown', set_faddr1);  
  faddr2.addEventListener('keydown', set_faddr2);  
  faddr3.addEventListener('keydown', set_faddr3);  

  frfs.addEventListener('keydown', set_frfs);  

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
    p.stroke(0, 53, 75);
    // p.stroke(255, 100, 150);
    p.noFill();
    // let secondAngle = p.map(sc, 0, 60, 0, 360);
    // p.arc(0, 0, 300, 300, 0, degree);  //degree
    p.arc(0, 0, 300, 300, 0, x); 

    p.stroke(101, 187, 169);
    // p.stroke(150, 100, 255);
    // let minuteAngle = p.map(mn, 0, 60, 0, 360);
    // p.arc(0, 0, 280, 280, 0, minuteAngle);
    p.arc(0, 0, 280, 280, 0, y);
  
    p.stroke(219, 65, 64);
    // p.stroke(150, 255, 100);
    // let secondAngle = p.map(sc, 0, 60, 0, 360);
    // p.arc(0, 0, 260, 260, 0, secondAngle);
    p.arc(0, 0, 260, 260, 0, z);

    p.push();
    p.rotate(x);
    p.stroke(0, 53, 75);
    // p.stroke(255, 100, 150);
    p.line(0, 0, 100, 0);
    p.pop();
  
    p.push();
    p.rotate(y);
    p.stroke(101, 187, 169);
    // p.stroke(150, 100, 255);
    p.line(0, 0, 75, 0);
    p.pop();
  
    p.push();
    p.rotate(z);
    p.stroke(219, 65, 64);
    // p.stroke(150, 255, 100);
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
    p.text("PHASE_LIN： " + x + "°", 10, 10, 300, 200);
    
    p.fill(101, 187, 169);
    // p.fill(150, 100, 255);
    p.text("PHASE_DRIFTC： " + y + "°", 10, 30, 300, 200);

    p.fill(219, 65, 64);
    // p.fill(150, 255, 100);
    p.text("PHASE_SC： " + z + "°", 10, 50, 300, 200);

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
