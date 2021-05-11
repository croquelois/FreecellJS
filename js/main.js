
// CONSTS
var CARD_DECK = {
  suits: [
    { name:'club',    logo:'♣' },
    { name:'diamond', logo:'♦' },
    { name:'heart',   logo:'♥' },
    { name:'spade',   logo:'♠' }
  ],
  cards: [
    { name:'ace',   numb:'A',  class:'suit' },
    { name:'two',   numb:'2',  class:'suit' },
    { name:'three', numb:'3',  class:'suit' },
    { name:'four',  numb:'4',  class:'suit' },
    { name:'five',  numb:'5',  class:'suit' },
    { name:'six',   numb:'6',  class:'suit' },
    { name:'seven', numb:'7',  class:'suit' },
    { name:'eight', numb:'8',  class:'suit' },
    { name:'nine',  numb:'9',  class:'suit' },
    { name:'ten',   numb:'10', class:'suit' },
    { name:'jack',  numb:'J',  class:'face' },
    { name:'queen', numb:'Q',  class:'face' },
    { name:'king',  numb:'K',  class:'face' }
  ]
};
var SUIT_DICT = {
  club:    { color:'b', accepts:['diamond', 'heart'] },
  diamond: { color:'r', accepts:['club'   , 'spade'] },
  heart:   { color:'r', accepts:['club'   , 'spade'] },
  spade:   { color:'b', accepts:['diamond', 'heart'] }
};
var NUMB_DICT = {
  A: { cascDrop:''  , founDrop:'2' },
  2: { cascDrop:'A' , founDrop:'3' },
  3: { cascDrop:'2' , founDrop:'4' },
  4: { cascDrop:'3' , founDrop:'5' },
  5: { cascDrop:'4' , founDrop:'6' },
  6: { cascDrop:'5' , founDrop:'7' },
  7: { cascDrop:'6' , founDrop:'8' },
  8: { cascDrop:'7' , founDrop:'9' },
  9: { cascDrop:'8' , founDrop:'10'},
  10:{ cascDrop:'9' , founDrop:'J' },
  J: { cascDrop:'10', founDrop:'Q' },
  Q: { cascDrop:'J' , founDrop:'K' },
  K: { cascDrop:'Q' , founDrop:''  }
};
// VARIABLES
var gAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
var gTimer;

// GAME SETUP
{
  // SETUP: Table backgrounds
  var gGameTableBkgds = {};
  gGameTableBkgds.pattern = { url:'img/table_pattern.jpg' };
  gGameTableBkgds.circles = { url:'img/table_circles.jpg' };
  gGameTableBkgds.felt    = { url:'img/table_felt.jpg'    };
  gGameTableBkgds.plain   = { url:'img/table_plain.png'   };

  // SETUP: Game Options / Defaults
  var gGameOpts = {};
  gGameOpts.allowFounReuse = false;
  gGameOpts.cheatUnlimOpen = false;
  gGameOpts.debugOneLeft   = false;
  gGameOpts.showTips       = true;
  gGameOpts.sound          = true;
  gGameOpts.tableBkgdUrl   = gGameTableBkgds.pattern.url;

  // SETUP: Define / Start async load of sounds files
  // NOTE: iOS (as of iOS9) is unable to play ogg files, so we are using MP3 for everything
  var gGameSounds = {};
  gGameSounds.cardFlip    = { buffer:null, url:'sounds/cardFlip.mp3',    src:'freesound.org/people/f4ngy/sounds/240776/'    };
  gGameSounds.cardShuffle = { buffer:null, url:'sounds/cardShuffle.mp3', src:'freesound.org/people/deathpie/sounds/19245/'  };
  gGameSounds.crowdCheer  = { buffer:null, url:'sounds/crowdCheer.mp3',  src:'soundbible.com/1700-5-Sec-Crowd-Cheer.html'   };
  gGameSounds.sadTrombone = { buffer:null, url:'sounds/sadTrombone.mp3', src:'freesound.org/people/Benboncan/sounds/73581/' };
}

// ==============================================================================================

function setupDraggable(card){
  card
  .draggable({
    helper: cascHelper,
    revert: true,
    start : handleDragStart,
    stop  : handleDragStop
  })
  .dblclick(function(){
    handleCardDblClick($(this));
  });
}

function showCard(card){
  card.show().css('visibility', 'visible');
  card.find("span").show().css('visibility', 'visible');
}

function dropCard(card, where, zIndex = '', top = 0, draggable = true, position = 'relative'){
  // STEP 1: Warn listeners that the card is moving out of it's previous place
  card.trigger("moveOut");
  // STEP 2: Clone the card
  let newCard = card.clone();
  // STEP 3: Place the cards
  newCard.css({'position': position, 'left':'0px', 'top':top+'px', 'z-index':zIndex});
  where.append(newCard);
  // STEP 4: Make sure the new card will be visible
  showCard(newCard);
  // STEP 5: Remove the dragged cards from the board
  card.draggable('option', 'revert', false);
  card.detach().hide();
  // STEP 6: make it draggable
  if ( !draggable )
    newCard.css('cursor','default');
  else
    setupDraggable(newCard);
  // FINALLY: return the cloned card for further processing
  return newCard;
}

function checkFounDrop(ui, drop){
  // RULE 1: Was only a single card provided?
  if ( ui.helper.children().length != 1 ) {
    if ( gGameOpts.showTips ) null; // TODO
    return false;
  }

  // RULE 2: Is card valid?
  if ( drop.children('.card').length == 0 ) {
    if ( ui.draggable.data('numb') != 'A' ) {
      if ( gGameOpts.showTips ) null; // TODO
      return false;
    }
  }
  else {
    var card = $(ui.draggable);
    var topCard = $(drop.children('.card').last());

    // Is card next in sequence?
    if ( topCard.data('suit') != card.data('suit') || NUMB_DICT[topCard.data('numb')].founDrop != card.data('numb') ) {
      if ( gGameOpts.showTips ) null; // TODO
      return false;
    }
  }
  return true;
}

function handleFounDrop(event, ui, drop) {
  if(!checkFounDrop(ui, drop))
    return false;
  
  // STEP 1: VFX/SFX update
  if(gGameOpts.sound)
    playSound(gGameSounds.cardFlip);

  // STEP 2: Place it into this foundation
  let zIndex = $(drop).find('.card').length;
  let newCard = dropCard(ui.draggable, $(drop), zIndex, 0, gGameOpts.allowFounReuse, "absolute");

  // STEP 3: CHECK: End of game?
  if ( $('#cardFoun .card').length == 52 )
    doGameWon();
}

function checkOpenDrop(ui, drop){
  // RULE 1: Was only a single card provided?
  if ( ui.helper.children().length != 1 ) {
    if ( gGameOpts.showTips ) null; // TODO
    return false;
  }
  if ( drop.children().length != 0){
    if ( gGameOpts.showTips ) null; // TODO
    return false;
  }
  return true;
}

function handleOpenDrop(event, ui, drop) {
  if(!checkOpenDrop(ui, drop))
    return false;
  
  // STEP 1: VFX/SFX update
  if (gGameOpts.sound) playSound(gGameSounds.cardFlip);
  
  // STEP 2: Place it in the free cell
  let newCard = dropCard(ui.draggable, $(drop), 99);

  // STEP 3: Turn off this slot until it frees up again
  if ( !gGameOpts.cheatUnlimOpen ) 
    drop.droppable('disable');
  else 
    $.each(drop.children('.card'), (i,card) => $(card).css('position','relative').css('top',i*-1*($(card).height()-20)+'px'));

  // STEP 4: When the card will move out of the slot, reactivate it
  newCard.one("moveOut", () => $(drop).droppable('enable'));
}

function checkCascDrop(ui,drop){
  // DESIGN: We check for valid sets upon dragStart, so assume set sequence is valid upon drop
  // RULE 1: Is the single-card/container-top-card in run order?
  let cardTopCasc = drop.children().last();
  let card = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children()[0] : ui.draggable;
  if ( drop.children().length > 0
    && ( $.inArray($(cardTopCasc).data('suit'), SUIT_DICT[$(card).data('suit')].accepts) == -1
      || NUMB_DICT[$(cardTopCasc).data('numb')].cascDrop != $(card).data('numb') )
  ) {
    if ( gGameOpts.showTips ) null; // TODO
    return false;
  }
  return true;
}

function handleCascDrop(event, ui, drop) {
  if(!checkCascDrop(ui, drop))
    return false;

  // STEP 1: VFX/SFX update
  if (gGameOpts.sound) playSound(gGameSounds.cardFlip);

  // STEP 2: Place cards into this cascade
  let cards = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children() : [ui.draggable];
  let cardOffset = getCardOffset();
  $.each(cards, (i, card) => {
    let intTop = ( drop.children().length > 0 ) ? Number(drop.children().last().css('top').replace('px','')) - ($('.card:first-child').height() - cardOffset) : 0;
    let newCard = dropCard($('#'+$(card).prop('id')), $(drop), '', intTop);
  });

  // STEP 3: Shorten fanning padding if card stack grows too large
  // TODO: measure #playArea and length of children
}

function handleCardDblClick(card) {
  // RULE 1: Only topmost card can be double-clicked
  if ( $($(card).parent().find('.card:last-child')[0]).prop('id') != $(card).prop('id') ) return;

  let event = {};
  let ui = { draggable:$(card), helper:{ children:function(){ return [$(card)]; } } };
  let drop = null;
  
  // are we in the cascades ?
  if($(card).parents("#cardCasc").length > 0){
      // CHECK 1: Can card go to foundation?
      drop = ['#cardFoun1','#cardFoun2','#cardFoun3','#cardFoun4'].map(id => $(id)).filter(drop => checkFounDrop(ui,drop))[0];
      if(drop)
        return handleFounDrop(event, ui, drop);
      
      // CHECK 2: Do we have an open slot to send this card to?
      drop = ['#cardOpen1','#cardOpen2','#cardOpen3','#cardOpen4'].map(id => $(id)).filter(drop => checkOpenDrop(ui, drop))[0];
      if(drop)
        return handleOpenDrop(event, ui, drop);
  }
  
  // are we in the open slot ?
  if($(card).parents("#cardOpen").length > 0){
    // CHECK 1: Can card go to foundation?
    drop = ['#cardFoun1','#cardFoun2','#cardFoun3','#cardFoun4'].map(id => $(id)).filter(drop => checkFounDrop(ui,drop))[0];
    if(drop){
      $(card).trigger("dragstart");
      return handleFounDrop(event, ui, drop);
    }
  }
}

/**
 * jquery-ui handler
 * Validate selection - only begin drag if selection meets rules
 */
function handleDragStart(event, ui){
  var prevCard;

  // RULE 1: If a group is being dragged, then validate the sequence, otherwise, dont allow drag to even start
  if ( ui.helper.prop('id') == 'draggingContainer' && ui.helper.children().length > 1 ) {
    for (var idx=0; idx<ui.helper.children().length; idx++) {
      var card = ui.helper.children()[idx];
      // Just capture first card, then start checking seq
      if ( idx > 0 ) {
        if ( $.inArray($(card).data('suit'), SUIT_DICT[$(prevCard).data('suit')].accepts) == -1
          || NUMB_DICT[$(prevCard).data('numb')].cascDrop != $(card).data('numb')
        ) {
          // Disallow drag start
          handleDragStop(event, ui);
          return false;
        }
      }
      prevCard = card;
    }
  }

  // RULE 2: Ensure enough free slots existing to handle number of cards being dragged
  if ( ui.helper.prop('id') == 'draggingContainer' && ui.helper.children().length > 1 ) {
    if ( (ui.helper.children().length - 1) > (4 - $('#cardOpen .card').length) ) {
      if ( gGameOpts.showTips ) null; // TODO
      // Disallow drag start
      handleDragStop(event, ui);
      return false;
    }
  }
}

function handleDragStop(event, ui){
  let cards = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children() : [ui.draggable];
  $.each(cards, (i, card) => {
    let cardId = '#'+$(card).prop('id');
    showCard($('#cardCasc').find(cardId));
    showCard($('#cardFoun').find(cardId));
    showCard($('#cardOpen').find(cardId));
  });
}

// ==============================================================================================

function handleStartBtn() {
  // STEP 1:
  $('#dialogStart').dialog('close');

  // STEP 2: iOS requires a touch event before any type of audio can be played, then everything will work as normal
  // SOLN: A: play a dummy sound (https://paulbakaus.com/tutorials/html5/web-audio-on-ios/)
  // ....: B: play a real startup sound when applicable (this is our case)
  if (gGameOpts.sound) playSound(gGameSounds.cardShuffle);

  // STEP 3: Fill board
  doFillBoard();
}

function handleMenuBtn() {
  $('#dialogMenu').dialog('open');
  $('#dialogMenu button').blur();
}

function handleOptionsNewGame() {
  // STEP 1: UX/UI Update
  if (gGameOpts.sound) playSound(gGameSounds.sadTrombone);

  // STEP 2: Close dialog
  $('#dialogMenu').dialog('close');

  // STEP 3: Clear/Fill board
  doFillBoard();
}

function handleOptionsOpen() {
  // STEP 1: Update UI options
  $('#chkOptSound').prop('checked', gGameOpts.sound);

  // LAST: Open dialog
  $('#dialogOptions').dialog('open');
}

function handleOptionsClose() {
  // STEP 1: Update game options
  gGameOpts.sound = $('#chkOptSound').prop('checked');
  localStorage.sound = (gGameOpts.sound?"true":"false");
  
  // STEP 2: Set background
  var strBkgdUrl = $('input[type="radio"][name="radBkgd"]:checked').data('url');
  if ( strBkgdUrl ) $('body').css('background', 'url("'+ strBkgdUrl +'")');
  localStorage.tableBkgdUrl = strBkgdUrl;

  // LAST: Close dialog
  $('#dialogOptions').dialog('close');
}

function playSound(objSound) {
  // SRC: http://www.html5rocks.com/en/tutorials/webaudio/intro/

  // STEP 1: Reality Check
  if ( !objSound.buffer ) {
    console.warn('WARN: No buffer exists for: '+objSound.url);
    console.log(objSound.buffer);
    return;
  }

  // STEP 2: Create new bufferSource with existing file buffer and play sound
  var source = gAudioCtx.createBufferSource();
  source.buffer = objSound.buffer;
  source.connect(gAudioCtx.destination);
  (source.start) ? source.start(0) : source.noteOn(0);
}

// ==============================================================================================

function cascHelper() {
  // A: Build container and fill with cards selected
  var container = $('<div/>').attr('id', 'draggingContainer').addClass('cardCont');
  container.css( 'position', 'absolute' );
  container.css( 'z-index', '100' );
  container.css( 'top' , $(this).offset().top +'px' );
  container.css( 'left', $(this).offset().left+'px' );
  container.append( $(this).clone() );
  container.append( $(this).nextAll('.card').clone() );

  // B: Hide original cards
  $(this).css('visibility','hidden'); // IMPORTANT: Dont hide() this or container jumps to {0,0} (jQuery must be using .next or whatever)
  $(this).find('span').css('visibility','hidden'); // IMPORTANT: the cool cards we use have spans that must be set on their own
  $(this).nextAll().hide();

  // C: "Cascade" cards in container to match orig style
  // REQD! We have to do this as we use negative margins to stack cards above, else they'll go up in this container and look all doofy
  let cardOffset = getCardOffset();
  container.find('div.card').each(function(i,ele){ $(this).css('position', 'absolute').css('top', (i*cardOffset)+'px'); });

  // LAST:
  return container;
}

function doFillBoard() {
  var arrCards = [];
  var strHtml = '';

  // STEP 1: VFX/SFX
  if (gGameOpts.sound) playSound(gGameSounds.cardShuffle);

  // STEP 2: Build cards
  $('.card').remove();
  $.each(CARD_DECK.suits, function(i,suit){
    $.each(CARD_DECK.cards, function(j,card){
      // A:
      var objNode = $('<div id="card'+ suit.name.substring(0,1) + card.numb +'" class="card" '
        + ' data-suit="'+suit.name+'" data-numb="'+card.numb+'">'
        + '<div class="card-'+card.name+' '+suit.name+'">'
        + '<div class="corner top">'
        + '<span class="number'+ (card.numb == '10' ? ' ten':'') +'">'+card.numb+'</span><span>'+suit.logo+'</span></div>'
        + (card.class == 'suit'
          ? '<span class="suit top_center">'+suit.logo+'</span><span class="suit bottom_center">'+suit.logo+'</span>'
          : '<span class="face middle_center"><img src="img/faces/face-'+card.name+'-'+suit.name+'.png"></span>'
        )
        + '<div class="corner bottom">'
        + '<span class="number'+ (card.numb == '10' ? ' ten':'') +'">'+card.numb+'</span><span>'+suit.logo+'</span></div>'
        + '</div>'
        + '</div>');
      // B:
      arrCards.push( objNode );
    });
  });

  // STEP 3: Shuffle / Deal cards into tableau, fanned style
  var intCol = 1;
  if ( gGameOpts.debugOneLeft ) {
    $.each(arrCards, function(i,card){
      if      (i < 13) $('#cardFoun1').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else if (i < 26) $('#cardFoun2').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else if (i < 39) $('#cardFoun3').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else if (i < 51) $('#cardFoun4').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else             $('#cardCasc1').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
    });
  }
  else {
    let cardOffset = getCardOffset();
    $.each(arrCards.shuffle(), function(i,card){
      // NOTE: Set on the element itself (using a class with these values will not work)
      card.css('position','relative');
      card.css('left', (i%2 == 0 ? '-1000px' : '1000px') );
      card.css('top',  (i%2 == 0 ? '-1000px' : '1000px') );

      // Append CARD using animation
      $('#cardCasc'+intCol).append( card.animate({ left:0, top:-($('#cardCasc'+intCol+' .card').length * ($('.card:first-child').height()-cardOffset)) + 'px' }, (i*1000/52) ) );

      // Fill cascade cols in round-robin order
      intCol = intCol%8 + 1;
    });
  }

  // STEP 4: Draggable setup
  setupDraggable($('.card'));
  
  // STEP 5: Adjust card fanning offset
  doRespLayout();
  
  // STEP 6: Inform the statistics module
  Stats.startGame();
}

function doGameWon() {
  // FYI: pulsing CSS text (http://jsfiddle.net/thirtydot/aDZLy/)
  var intDelay = 500;

  // STEP 1: VFX/SFX update
  if (gGameOpts.sound) playSound(gGameSounds.crowdCheer);

  // STEP 2:
  $('#dialogYouWon').dialog('open');
  console.log('boom');

  // STEP 3:
  for (var idx=12; idx>=0; idx--){
    $('.card[data-numb='+CARD_DECK.cards[idx].numb+']').each(function(i,card){
      $(card).animate( {left:( Math.floor(Math.random()*12) * 100 )+'px', top:($(window).innerHeight()*1.1)+'px'}, (intDelay += 100), function(){$(this).remove();} );
    });
  }
  
  // STEP 4: Update stats
  Stats.gameWon();
}

function loadSounds() {
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/decodeAudioData (most up-to-date source)
  // SEE: http://www.html5rocks.com/en/tutorials/webaudio/intro/

  // STEP 1: Load each sound
  $.each(gGameSounds, function(key,sound){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', sound.url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e){
      if (this.status == 0 || this.status == 200)
        gAudioCtx.decodeAudioData(xhr.response, function(buffer){ sound.buffer = buffer; }, onError);
    };
    xhr.send();
  });

  function onError(e){ console.error("Unable to load sound. "+e); }
}

function getCardOffset(){
  if($(window).innerWidth() < 800)
    return 40;
  if($(window).innerWidth() < 900)
    return 40;
  return 50;
}

function doRespLayout() {
  // STEP 1: Re-fan cards to handle varying offsets as resizes occur
  let cardOffset = getCardOffset();
  $('#cardCasc > div').each(function(i,col){
    $(col).find('.card').each(function(idx,card){ 
      $(card).css('top','-'+(idx*($('.card:first-child').height()-cardOffset))+'px'); 
    });
  });
}

function appStart() {
  // STEP 1: Start async load of sound files
  loadSounds();

  // STEP 2: Setup 3 core droppable areas
  $('#cardFoun .slot').droppable({
    accept:     '.card',
    hoverClass: 'hvr-pulse-grow-hover',
    tolerance:  'pointer',
    drop:       function(event,ui){handleFounDrop(event,ui,$(this));}
  });
  $('#cardOpen .slot').droppable({
    accept:     '.card',
    hoverClass: 'hvr-pulse-grow-hover',
    tolerance:  'pointer',
    drop:       function(event,ui){ handleOpenDrop(event, ui, $(this)); }
  });
  $('#cardCasc > div').droppable({
    accept:     '.card',
    hoverClass: 'cascHover',
    tolerance:  'pointer',
    drop:       function(event,ui){ handleCascDrop(event, ui, $(this)); }
  });

  // STEP 3: jQuery Dialog setup
  $('#dialogStart').dialog({
    modal: true,
    autoOpen: true,
    draggable: false,
    resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: false,
    height: ( $(window).innerWidth() < 1080 ? 300 : 330 ),
    width:  ( $(window).innerWidth() * ( $(window).innerWidth() < 1080 ? 0.9 : 0.8 ) )
  });
  $('#dialogYouWon').dialog({
    modal: true,
    autoOpen: false,
    draggable: false,
    resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: false,
    width: ($(window).innerWidth() * 0.6),
    height: ($(window).innerHeight() * 0.5)
  });
  $('#dialogMenu').dialog({
    modal: true,
    autoOpen: false,
    draggable: false,
    resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: true,
    width: ( $(window).innerWidth() * ( $(window).innerWidth() < 1080 ? 0.5 : 0.4 ) )
  });
  $('#dialogOptions').dialog({
    modal: true,
    autoOpen: false,
    draggable: false,
    resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: true,
    width: ( $(window).innerWidth() * ( $(window).innerWidth() < 1080 ? 0.5 : 0.3 ) )
  });
  
  // STEP 4: Add handler for window resize (use a slight delay for PERF)
  window.onresize = function(){ clearTimeout(gTimer); gTimer = setTimeout(doRespLayout, 0); };

  // STEP 5: Web-Audio for iOS
  $(document).on('touchstart', '#btnStart', function(){
    // A: Create and play a dummy sound to init sound in iOS
    // NOTE: iOS (iOS8+) mutes all sounds until a touch is detected (good on you Apple!), so we have to do this little thing here
    var buffer = gAudioCtx.createBuffer(1, 1, 22050); // create empty buffer
    var source = gAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gAudioCtx.destination); // connect to output (your speakers)
    (source.start) ? source.start(0) : source.noteOn(0);

    // B: Start game
    handleStartBtn();
  });

  // STEP 6: Initialise options popup
  if(localStorage.tableBkgdUrl)
    gGameOpts.tableBkgdUrl = localStorage.tableBkgdUrl;
  $('body').css('background', 'url("'+ gGameOpts.tableBkgdUrl +'")');
  if(localStorage.sound)
    gGameOpts.sound = (localStorage.sound == "true");
  $('#chkOptSound').prop('checked', gGameOpts.sound);
  $.each(gGameTableBkgds, function(i,obj){
    var strHtml = '<div>'
          + '  <div><input id="radBkgd'+i+'" name="radBkgd" type="radio" data-url="'+ obj.url +'" '
          + (gGameOpts.tableBkgdUrl == obj.url ? ' checked="checked"' : '') + '></div>'
          + '  <div><label for="radBkgd'+i+'"><div style="background:url(\''+ obj.url +'\'); width:100%; height:60px;"></div></div>'
          + '</div>';

    $('#optBkgds').append( strHtml );
  });
  
  // STEP 7: Initialise statistics popup
  Stats.init();
}

// ==============================================================================================
$(document).ready(function(){ appStart(); })