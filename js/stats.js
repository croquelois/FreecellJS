/* jshint esversion:8, loopfunc:true, undef: true, unused: true, sub:true, browser:true */
/* global $, console */
/* exported Stats */

var Stats = (function(){
  let stats;
  
  function load(){
    let v = localStorage.stats;
    stats = {};
    if(v){
      try{
        stats = JSON.parse(v);
      }catch(err){
        console.log("can't parse localstorage game statistics: ", err);
      }
    }
    return stats;
  }
  function save(){
    localStorage.stats = JSON.stringify(stats);
  }
  function getStats(){
    let allGames = (load().allGames || []);
    let nbWin = allGames.filter(g => g.status == "Win").length;
    let nbLose = allGames.filter(g => g.status == "Lose").length;
    let maxConsWin = 0;
    let curConsWin = 0;
    allGames.forEach(g => {
      if(g.status == "Lose"){
        curConsWin = 0;
        return;
      }
      curConsWin++;
      if(maxConsWin < curConsWin)
        maxConsWin = curConsWin;
    });
    let avgWinTime = "#:##";
    if(nbWin){
      avgWinTime = allGames.filter(g => g.status == "Win").reduce((t,g) => t += g.time, 0)/nbWin;
      avgWinTime = avgWinTime/1000;
      let min = Math.floor(avgWinTime/60);
      let sec = Math.floor(avgWinTime)%60;
      avgWinTime = ""+min+":"+(sec<10?"0"+sec:sec);
    }
    return {nbWin,nbLose,maxConsWin,curConsWin,avgWinTime};
  }
  function endGame(status){
    stats.allGames = (stats.allGames || []);
    let endTime = new Date();
    let startTime = endTime;
    if(stats.startTime){
      startTime = new Date(stats.startTime);
      delete stats.startTime;
    }else{
      console.log("start time was not defined");
    }
    stats.allGames.push({status, time: (endTime - startTime)});
  }
  function startGame(){
    load();
    if(stats.startTime){
      endGame("Lose");
      stats.startTime = null;
      save();
    }
  }
  function cardMoved(){
    if(!stats.startTime){
      load();
      stats.startTime = ""+(new Date());
      save();
    }
  }
  function gameWon(){
    load();
    endGame("Win");
    save();
  }
  function reset(){
    stats = {};
    save();
  }
  function refresh(){
    let stats = getStats();
    $('#stats-nbWin').text(stats.nbWin);
    $('#stats-nbLose').text(stats.nbLose);
    $('#stats-maxConsWin').text(stats.maxConsWin);
    $('#stats-curConsWin').text(stats.curConsWin);
    $('#stats-avgWinTime').text(stats.avgWinTime);
  }
  function getSize(){
    let winW = $(window).innerWidth();
    if(winW < 600)
      return "80%";
    return 0.8*600;
  }
  function init(){
    let position = { my: "center", at: "center", of: window };
    $('#dialogStats').dialog({
      modal: true,
      autoOpen: false,
      draggable: false,
      resizable: false,
      dialogClass: 'dialogCool',
      closeOnEscape: true,
      width: getSize(),
      position
    });
    $('#resetBtn').click(() => {
      reset();
      refresh();
    });
    $(window).on("window:resize", () => $('#dialogStats').dialog({position,width:getSize()}));
    }
  function handleOpen() {
    refresh();
    $('#dialogStats').dialog('open');
  }
  return {gameWon, startGame, cardMoved, handleOpen, init};
})();

