/*
 * jQuery SuperBox! 0.9.2-dev
 * Copyright (c) 2009 Pierre Bertet (pierrebertet.net)
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * TODO :
 * - Document.load if init is before </body> against IE crash.
 * - Animations
 * - Image / Gallery mode : display a legend
*/
;(function($) {
	
	// Local variables
	var $curLink, $overlay, $wrapper, $container, $superbox, $closeBtn, $loading, $nextprev, $nextBtn, $prevBtn, settings,
	
	// Default settings
	defaultSettings = {
		boxId: "superbox",
		boxClasses: "",
		overlayOpacity: .8,
		boxWidth: "600",
		boxHeight: "400",
		loadTxt: "Loading...",
		closeTxt: "Fermer",
		prevTxt: "&larr; Précédente",
		nextTxt: "Suivante &rarr;",
		beforeOpen: function(){},
		afterOpen: function(){}
	},
	
	galleryGroups = {},
	galleryMode = false,
	hideElts = $([]),
	isWaiting = false;
	
	// Init dispatcher
	$.superbox = function() {
		
		// Settings
		settings = $.extend({}, defaultSettings, $.superbox.settings);
		
		// If IE6, select elements to hide
		// if ($.browser.msie && $.browser.version < 7) {
		// 	hideElts = hideElts.add("select");
		// }
		
		// Do not init SuperBox! twice
		if ($.superbox.mainInit !== true) {
			
			// Create base elements
			createElements();
			
			// Init global events (left / right, echap)
			initGlobalEvents();
			
			$.superbox.mainInit = true;
		}
		
		// Dispatch types
		dispatch();
	};
	
	// Dispatch types
	function dispatch() {
		
		// Match all superbox links
		$("a[rel^=superbox],area[rel^=superbox]").each(function() {
			
			// Optimisation
			var $this = $(this),
			relAttr = $this.attr("rel"),
			
			// Match first argument. Ex: superbox[gallery#my_id.my_class][my_gallery] > gallery#my_id.my_class
			firstArg = relAttr.match(/^superbox\[([^\]]+)\]/)[1],
			
			// Match type. Ex: superbox[gallery#my_id.my_class][my_gallery] > gallery
			type = firstArg.match(/^([^#\.]+)/)[1],
			
			// Match additionnal classes or IDs (#xxx.yyy.zzz)
			boxCurrentAttrs = firstArg.replace(type, "").match(/([#\.][^#\.\]]+)/g) || [],
			
			// Box ID and classes
			newBoxId = settings.boxId,
			newBoxClasses = settings.boxClasses;
			
			// Prevent multiple inits
			if ($this.data("superbox_init")) { return; }
			$this.data("superbox_init", true);
			
			// Additionnal rel settings
			this._relSettings = relAttr.replace("superbox["+ type + boxCurrentAttrs.join("") +"]", "");
			
			// Redefine settings
			$.each(boxCurrentAttrs, function(i, val) { // each class or id
				if (val.substr(0,1) == "#") {
					newBoxId = val.substr(1);
					
				} else if (val.substr(0,1) == ".") {
					newBoxClasses += " " + val.substr(1);
				}
			});
			
			// Call type method
			if (type.search(/^image|gallery|iframe|content|ajax$/) != -1) {
				$this.superbox(type, {boxId: newBoxId, boxClasses: newBoxClasses});
			}
		});
	};
	
	/*-- Superbox Method --*/
	$.fn.superbox = function(type, curSettings) {
	  
		$.superbox[type](this, $.extend({}, settings, curSettings));
		
		this.click(function(e) {
			e.preventDefault();
			$curLink = this;
		});
	};
	
	/*-- Types --*/
	$.extend($.superbox, {
		
		// Wait... (loading)
		wait: function(callback) {
			
			isWaiting = true;
			
			prepareBox();
			
			// Loading anim
			initLoading(function() {
				
				// Execute callback after animation
				callback();
			});
		},
		
		// Custom SuperBox!
		open: function(content, curSettings) {
			
			curSettings = $.extend({}, settings, curSettings);
			
			// Launch load animation
			if (!isWaiting) {
				$.superbox.wait(function(){
					$.superbox.open(content, curSettings);
				});
				return;
			}
			
			// Specified dimensions
			$superbox.width( curSettings.boxWidth+"px" );
			$innerbox.height( curSettings.boxHeight+"px" );
			
			// Set Id and Classes
			$superbox.attr("id", curSettings.boxId).attr("class", curSettings.boxClasses);
			
			// Append content
			$(content).appendTo($innerbox);
			
			// Show box
			showBox(curSettings);
			
			// Stop waiting
			isWaiting = false;
		},
		
		// Close SuperBox!
		close: function() {
			
			hideBox();
			$overlay.fadeOut(300, function() {
				
				// Show hidden elements for IE6
				hideElts.show();
			});
			galleryMode = false;
		},
		
		// Image
		image: function($elt, curSettings, isGallery) {
			
			// On click event
			$elt.click(function() {
				
				galleryMode = !!isGallery;
				
				$.superbox.wait(function() {
					
					var relSettings = getRelSettings($elt.get(0)),
					dimensions = false;
					
					// Extra settings
					if (!!relSettings) {
						
						var relDimensions;
						
					 	if (galleryMode) {
							relDimensions = relSettings[1];
							
						} else {
							relDimensions = relSettings[0];
						}
						
						if (!!relDimensions) {
							dimensions = relDimensions.split("x");
						}
					}
					

					// Image
					var $curImg = $('<img src="'+ $elt.attr("href") +'" title="'+ ($elt.attr("title") || $elt.text()) +'" />');
					
					// On image load
					$curImg.load(function() {
						
						// Image box dimensions
						if (!!dimensions && dimensions[0] != "") {
							var boxWidth = dimensions[0] - 0;
						} else {
							// image width + $innerbox padding
							var boxWidth = $curImg.width() + ($innerbox.css("paddingLeft").slice(0,-2)-0) + ($innerbox.css("paddingRight").slice(0,-2)-0) +50;
						}
						if (!!dimensions && dimensions[1] != "") {
							var boxHeight = dimensions[1] - 0;
						} else {
							var boxHeight = $curImg.height();
						}
						
						var localSettings = $.extend({}, curSettings, {
						  boxClasses: (galleryMode? "gallery " : "image ") + curSettings.boxClasses,
							boxWidth: boxWidth,
							boxHeight: boxHeight,
							beforeOpen: function() {
								if (galleryMode) {
									// "Prev / Next" buttons
									nextPrev($elt, relSettings[0]);
								}
							}
						});
						
						// Open SuperBox!
						$.superbox.open($curImg, localSettings);
					});
					
					// Append image to SuperBox! (to trigger loading)
					$curImg.appendTo($innerbox);

					//add title 
					$('.superbox-title').html($elt.children().attr("original-title"));

					//add share buttons
					var btnshare = $('.btn-share');
					if (btnshare.length){
						$('.btn-share').html('<div class="addthis_toolbox addthis_default_style "><a class="addthis_button_facebook popup" addthis:url="'+ $elt.attr("href") +'" addthis:title="'+$elt.children().attr("original-title")+'"></a> <a class="addthis_button_twitter popup" addthis:url="'+ $elt.attr("href") +'" addthis:title="'+$elt.children().attr("original-title")+'"></a> <a class="addthis_button_reddit popup" addthis:url="'+ $elt.attr("href") +'" addthis:title="'+$elt.children().attr("original-title")+'"></a><a class="addthis_button_google_plusone popup" addthis:url="'+ $elt.attr("href") +'" addthis:title="'+$elt.children().attr("original-title")+'"></a></div>');


							var script = 'http://s7.addthis.com/js/250/addthis_widget.js#domready=1&#pubid=ra-5025620b7c4e0465';
							if (window.addthis){
							    window.addthis = null;
							}
							$.getScript( script );
					}

	 

				});
				
			});
		},
		
		// Gallery
		gallery: function($elt, curSettings) {
			
			// Extra settings
			var extraSettings = getRelSettings($elt.get(0));
			
			// Create group
			if(!galleryGroups[extraSettings[0]]) {
				galleryGroups[extraSettings[0]] = [];
			}
			
			// Add element to current group
			galleryGroups[extraSettings[0]].push($elt);
			
			$elt.data("superboxGroupKey", galleryGroups[extraSettings[0]].length - 1);
			
			// Image Box
			$.superbox["image"]($elt, curSettings, true);
		},
		
		// iframe
		iframe: function($elt, curSettings) {
			
			// On click event
			$elt.click(function() {
				
				$.superbox.wait(function() {
					
					// Extra settings
					var extraSettings = getRelSettings($elt.get(0));
					
					// Dimensions
					var dims = false;
					if (extraSettings) {
						dims = extraSettings[0].split("x");
					}
					
					var localSettings = $.extend({}, curSettings, {
						boxClasses: "iframe " + curSettings.boxClasses,
						boxWidth: dims[0] || curSettings.boxWidth,
						boxHeight: dims[1] || curSettings.boxHeight
					});
					
					// iframe element
					var $iframe = $('<iframe title="'+ $elt.text() +'" src="'+ $elt.attr("href") +'" name="'+ $elt.attr("href") +'" frameborder="0" scrolling="auto" width="'+ curSettings.boxWidth +'" height="'+ curSettings.boxHeight +'"></iframe>');
					
					// On iframe load
					$iframe.one("load", function() {
						
						// Open SuperBox!
						$.superbox.open($iframe, localSettings);
					});
					
					// Append iframe to SuperBox! (to trigger loading)
					$iframe.appendTo($innerbox);
				});
				
			});
		},
		
		// Content
		content: function($elt, curSettings) {
			
			// On click event
			$elt.click(function() {
				
				$.superbox.wait(function() {
					
					// Extra settings
					var extraSettings = getRelSettings($elt.get(0));
					
					// Dimensions
					var dims = false;
					if (extraSettings) {
						dims = extraSettings[0].split("x");
					}
					
					// Specific settings
					var localSettings = $.extend({}, curSettings, {
					boxClasses: "content " + curSettings.boxClasses,
						boxWidth: dims[0] || curSettings.boxWidth,
						boxHeight: dims[1] || curSettings.boxHeight
					});
					
					// Open SuperBox!
					$.superbox.open($($elt.attr('href')).clone().show(), localSettings);
				});
				
			});
		},
		
		// Ajax
		ajax: function($elt, curSettings) {
			
			// On click event
			$elt.click(function() {
				
				$.superbox.wait(function() {
					
					// Extra settings
					var extraSettings = getRelSettings($elt.get(0));
					
					// Dimensions
					var dims = false;
					if (extraSettings && extraSettings[1]) {
						dims = extraSettings[1].split("x");
					}
					
					// Extend default dimension settings
					var localSettings = $.extend({}, curSettings, {
						boxClasses: "ajax " + curSettings.boxClasses,
						boxWidth: dims[0] || curSettings.boxWidth,
						boxHeight: dims[1] || curSettings.boxHeight
					});
					
					// Get Ajax URL + ID
					var splitUrl = extraSettings[0].split("#");
					var ajaxUrl = splitUrl[0];
					var anchor = splitUrl[1] || false;
					
					$.get( ajaxUrl, function(data) {
						
						// Get a specific element (by ID)?
						if (anchor !== false) {
							data = $(data).find("#" + anchor);
						}
						
						// Open SuperBox!
						$.superbox.open(data, localSettings);
					});
				});
			});
		}
	});
	
	// Get extra settings in rel attribute
	function getRelSettings(elt) {
		return elt._relSettings.match(/([^\[\]]+)/g);
	};
	
	// Next / Previous
	function nextPrev($elt, group) {
		
		$nextprev.show();
		
		galleryMode = true;
		
		var nextKey = $elt.data("superboxGroupKey") + 1,
			prevKey = nextKey - 2;
		
		// Next
		if (galleryGroups[group][nextKey]) {
			$nextBtn.removeClass("disabled").unbind("click").bind("click", function() {
				galleryGroups[group][nextKey].click();
			});
			
		} else {
			$nextBtn.addClass("disabled").unbind("click");
		}
		
		// Prev
		if (galleryGroups[group][prevKey]) {
			$prevBtn.removeClass("disabled").unbind("click").bind("click", function() {
				galleryGroups[group][prevKey].click();
			});
			
		} else {
			$prevBtn.addClass("disabled").unbind("click");
		}
		
		// Keys shortcuts
		$(document)
			.unbind("keydown.superbox_np")
			.bind("keydown.superbox_np", function(e) {
				
				// Left/right arrows
				if (e.keyCode == 39) {
					$nextBtn.click();
				
				} else if (e.keyCode == 37) {
					$prevBtn.click();
				}
			});
	};
	
	// Hide Box
	function hideBox() {
		
		if (!!$curLink) {
			$curLink.focus();
		}
		
		$(document).unbind("keydown.spbx_close").unbind("keydown.superbox_np");
		$loading.hide();
		$nextprev.hide();
		$wrapper.hide().css({position: "fixed", top: 0});
		$innerbox.empty();
		$curLink = null;
	};
	
	// "Loading..."
	function initLoading(callback) {
		
		// Keys shortcuts
		$(document)
			.unbind("keydown.spbx_close")
			.bind("keydown.spbx_close",function(e) {
				
				// Escape
				if (e.keyCode == 27) {
					$.superbox.close();
				}
			});
		
		var loading = function() {
			
			// IE6
			if($.browser.msie && $.browser.version < 7) {
				$wrapper.css({position: "absolute", top:"50%"});
			}
			
			// Hide elements for IE6
			hideElts.hide();
			
			$loading.show();
			callback();
		};
		
		if (galleryMode) {
			$overlay.css("opacity", settings.overlayOpacity).show();
			loading();
		}
		else {
			$overlay.css("opacity", 0).show().fadeTo(300, settings.overlayOpacity, loading);
		}
	};
	
	// "Prepare" box : Show $superbox with top:-99999px;
	function prepareBox() {
		$wrapper.show();
		$innerbox.empty();
		$superbox.css({position: "absolute", top: "-99999px"});
	};
	
	// Display box
	function showBox(curSettings) {
		
		curSettings = $.extend({}, settings, curSettings);
		
		// Stop "Loading..."
		$loading.hide();
		
		// Show $superbox
		$superbox.css({position: "static", top: 0, opacity: 0});
		
		// IE6 and IE7
		if ($.browser.msie && $.browser.version < 8) {
			$superbox.css({position: "relative", top:"-50%"});
			
			// IE6
			if ($.browser.msie && $.browser.version < 7) {
				$wrapper.css({position: "absolute", top:"50%"});
			}
		}
		
		// Position absolute if image height > window height
		if ( $(window).height() < $wrapper.height() ) {
			$wrapper.css({position: "absolute", top: ($wrapper.offset().top + 10) + "px"});
		}
		
		curSettings.beforeOpen();
		
		$superbox.fadeTo(300, 1, function(){
			curSettings.afterOpen();
		}).focus();
	};
	
	// Create base elements (overlay, wrapper, box, loading)
	function createElements() {
		
		// Overlay (background)
		$overlay = $('<div id="superbox-overlay"/>').appendTo("body").hide();
		
		// Wrapper
		$wrapper = $('<div id="superbox-wrapper"/>').appendTo("body").hide();
		
		// Box container
		$container = $('<div id="superbox-container"/>').appendTo($wrapper);
		
		// Box
		$superbox = $('<div id="superbox" tabindex="0"/>').appendTo($container);
		
		// Inner box
		$innerbox = $('<div id="superbox-innerbox"/>').appendTo($superbox);
		
		// "Next / Previous"
		$nextprev = $('<p class="nextprev"/>').prependTo($superbox).hide();
		$prevBtn = $('<a class="prev btn" tabindex="0" role="button"><strong><span>'+ settings.prevTxt +'</span></strong></a>').appendTo($nextprev);
		$nextBtn = $('<a class="next btn" tabindex="0" role="button"><strong><span>'+ settings.nextTxt +'</span></strong></a>').appendTo($nextprev);

		$shareBtn = $('<a  role="button" class="btn-share btn"></a>').appendTo($nextprev);

		//add title
		$('<div class="superbox-title"></div>').appendTo($nextprev);

		// Add close button
		$closeBtn = $('<p class="close"><a tabindex="0" class="btn" role="button"><strong><span>'+ settings.closeTxt +'</span></strong></a></p>').prependTo($superbox).find("a");
		
		// "Loading..."
		$loading = $('<p class="loading">'+ settings.loadTxt +'</p>').appendTo($container).hide();
	};
	
	// Init global events : close (echap), keyboard access (focus + enter)
	function initGlobalEvents() {
		
		// Hide on click
		$overlay.add($wrapper).add($closeBtn).click(function() {
			$.superbox.close();
		});
		
		// Remove "hide on click" on superbox
		$superbox.click(function(e) {
			e.stopPropagation();
		});
		
		// Opera already click on "focus + enter"
		if (!window.opera) {
			
			// Keyboard (focus + enter)
			$prevBtn.add($closeBtn).add($nextBtn).keypress(function(e) {
				if (e.keyCode === 13) {
					$(this).click();
				}
			});
		}
	}
	
})(jQuery);