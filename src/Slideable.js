/**
* Contains the declaration for the {@link module:layout/Slideable~Slideable} kind.
* @module layout/Slideable
*/

var
	kind = require('enyo/kind'),
	dom = require('enyo/dom'),
	platform = require('enyo/platform'),
	Animator = require('enyo/Animator'),
	Control = require('enyo/Control');

/**
* Fires when the Slideable finishes animating.
*
* @event module:layout/Slideable~Slideable#onAnimateFinish
* @type {enyo.Animator}
* @public
*/

/**
* Fires when the position (i.e., [value]{@link module:layout/Slideable~Slideable#value}) of the
* Slideable changes.
*
* @event module:layout/Slideable~Slideable#onChange
* @type {Object}
* @public
*/

/**
* {@link module:layout/Slideable~Slideable} is a control that may be dragged either horizontally
* or vertically between a minimum and a maximum value. When released from
* dragging, a Slideable will animate to its minimum or maximum position,
* depending on the direction of the drag.
*
* The [min]{@link module:layout/Slideable~Slideable#min} value specifies a position to the left of,
* or above, the initial position, to which the Slideable may be dragged.
* The [max]{@link module:layout/Slideable~Slideable#max} value specifies a position to the right of,
* or below, the initial position, to which the Slideable may be dragged.
* The [value]{@link module:layout/Slideable~Slideable#value} property specifies the current position
* of the Slideable, between the minimum and maximum positions.
*
* `min`, `max`, and `value` may be specified in units of 'px' or '%'.
*
* The [axis]{@link module:layout/Slideable~Slideable#axis} property determines whether the Slideable
* slides left-to-right ('h') or up-and-down ('v').
*
* The following control is placed 90% off the screen to the right, and slides
* to its natural position:
*
* ```javascript
* 	var
* 		kind = require('enyo/kind'),
* 		Slideable = require('layout/Slideable');
*
* 	{kind: Slideable, value: -90, min: -90, unit: '%',
* 		classes: 'enyo-fit', style: 'width: 300px;',
* 		components: [
* 			{content: 'stuff'}
* 		]
* 	}
* ```
*
* NOTE: If Slideable is used with [Accessibility]{@link module:enyo/AccessibilitySupport} the focus
* event can cause the screen to scroll as the browser attempts to position the contents on the
* screen. To prevent this, in the container of the Slideable set the `accessibilityPreventScroll`
* property to `true`:
*
* ```javascript
* 	accessibilityPreventScroll: true
* ```
*
* This issue is not unique to Slideable and can occur with other controls that extend beyond the
* viewport.
*
* @class Slideable
* @extends module:enyo/Control~Control
* @ui
* @public
*/
module.exports = kind(
	/** @lends module:layout/Slideable~Slideable.prototype */ {

	/**
	* @private
	*/
	name: 'enyo.Slideable',

	/**
	* @private
	*/
	kind: Control,

	/**
	* @lends module:layout/Slideable~Slideable.prototype
	* @private
	*/
	published: {
		/**
		* Direction of sliding; valid values are `'h'` for horizonal or `'v'` for vertical.
		*
		* @type {String}
		* @default 'h'
		* @public
		*/
		axis: 'h',

		/**
		* Current position of the Slideable (a value between
		* [min]{@link module:layout/Slideable~Slideable#min} and [max]{@link module:layout/Slideable~Slideable#max}).
		*
		* @type {Number}
		* @default  0
		* @public
		*/
		value: 0,

		/**
		* Unit for [min]{@link module:layout/Slideable~Slideable#min}, [max]{@link module:layout/Slideable~Slideable#max},
		* and [value]{@link module:layout/Slideable~Slideable#value}; valid values are `'px'` or `'%'`.
		*
		* @type {String}
		* @default  'px'
		* @public
		*/
		unit: 'px',

		/**
		* The minimum value to slide to.
		*
		* @type {Number}
		* @default 0
		* @public
		*/
		min: 0,

		/**
		* The maximum value to slide to.
		*
		* @type {Number}
		* @default  0
		* @public
		*/
		max: 0,

		/**
		* When truthy, applies CSS styles to allow GPU compositing of slideable
		* content, if allowed by the platform.
		*
		* @type {String}
		* @default  'auto'
		* @public
		*/
		accelerated: 'auto',

		/**
		* Set to `false` to prevent the Slideable from dragging with elasticity
		* past its [min]{@link module:layout/Slideable~Slideable#min} or [max]{@link module:layout/Slideable~Slideable#max}
		* value.
		*
		* @type {Boolean}
		* @default  true
		* @public
		*/
		overMoving: true,

		/**
		* Indicates whether dragging is allowed. Set to `false` to disable dragging.
		*
		* @type {Boolean}
		* @default  true
		* @public
		*/
		draggable: true
	},

	/**
	* @private
	*/
	events: {
		onAnimateFinish: '',
		onChange: ''
	},

	/**
	* Set to `true` to prevent drag events from bubbling beyond the Slideable.
	*
	* @private
	*/
	preventDragPropagation: false,

	/**
	* @private
	*/
	tools: [
		{kind: Animator, onStep: 'animatorStep', onEnd: 'animatorComplete'}
	],

	/**
	* @private
	*/
	handlers: {
		ondragstart: 'dragstart',
		ondrag: 'drag',
		ondragfinish: 'dragfinish'
	},

	/**
	* @private
	*/
	kDragScalar: 1,

	/**
	* @private
	*/
	dragEventProp: 'dx',

	/**
	* @private
	*/
	unitModifier: false,

	/**
	* @private
	*/
	canTransform: false,

	/**
	* Indicates which property of the drag event is used to position the control.
	*
	* @private
	*/
	dragMoveProp: 'dx',

	/**
	* Indicates which property of the drag event is used to allow dragging.
	*
	* @private
	*/
	shouldDragProp: 'horizontal',

	/**
	* The transform property to modify, provided that
	* [canTransform]{@link module:layout/Slideable~Slideable#canTransform} is `true`.
	*
	* @private
	*/
	transform: 'translateX',

	/**
	* The dimension attribute to modify; will be either `'height'` or `'width'`.
	*
	* @private
	*/
	dimension: 'width',

	/**
	* The position attribute to modify; will be either `'top'` or `'left'`.
	*
	* @private
	*/
	boundary: 'left',

	/**
	* @method
	* @private
	*/
	create: kind.inherit(function (sup) {
		return function () {
			sup.apply(this, arguments);
			this.acceleratedChanged();
			this.transformChanged();
			this.axisChanged();
			this.valueChanged();
			this.addClass('enyo-slideable');
		};
	}),

	/**
	* @method
	* @private
	*/
	initComponents: kind.inherit(function (sup) {
		return function () {
			this.createComponents(this.tools);
			sup.apply(this, arguments);
		};
	}),

	/**
	* @method
	* @private
	*/
	rendered: kind.inherit(function (sup) {
		return function () {
			sup.apply(this, arguments);
			this.canModifyUnit();
			this.updateDragScalar();
		};
	}),

	/**
	* @method
	* @private
	*/
	handleResize: kind.inherit(function (sup) {
		return function () {
			sup.apply(this, arguments);
			this.updateDragScalar();
		};
	}),

	/**
	* If transforms can't be used and inline style is using 'px' while
	* [unit]{@link module:layout/Slideable~Slideable#unit} is `'%'`, this sets the
	* [unitModifier]{@link module:layout/Slideable~Slideable#unitModifier} property to the current
	* value of [dimension]{@link module:layout/Slideable~Slideable#dimension}.
	*
	* @private
	*/
	canModifyUnit: function () {
		if (!this.canTransform) {
			var b = this.getInitialStyleValue(this.hasNode(), this.boundary);
			// If inline style of 'px' exists, while unit is '%'
			if (b.match(/px/i) && (this.unit === '%')) {
				// Set unitModifier - used to over-ride '%'
				this.unitModifier = this.getBounds()[this.dimension];
			}
		}
	},

	/**
	* @private
	*/
	getInitialStyleValue: function (node, boundary) {
		var s = dom.getComputedStyle(node);
		if (s) {
			return s.getPropertyValue(boundary);
		}
		return '0';
	},

	/**
	* @private
	*/
	updateBounds: function (value, dimensions) {
		var bounds = {};
		bounds[this.boundary] = value;
		this.setBounds(bounds, this.unit);

		this.setInlineStyles(value, dimensions);
	},

	/**
	* @private
	*/
	updateDragScalar: function () {
		if (this.unit == '%') {
			var d = this.getBounds()[this.dimension];
			this.kDragScalar = d ? 100 / d : 1;

			if (!this.canTransform) {
				this.updateBounds(this.value, 100);
			}
		}
	},

	/**
	* @private
	*/
	transformChanged: function () {
		this.canTransform = dom.canTransform();
	},

	/**
	* @private
	*/
	acceleratedChanged: function () {
		if (!platform.android || platform.android <= 2) {
			dom.accelerate(this, this.accelerated);
		}
	},

	/**
	* @private
	*/
	axisChanged: function () {
		var h = this.axis == 'h';
		this.dragMoveProp = h ? 'dx' : 'dy';
		this.shouldDragProp = h ? 'horizontal' : 'vertical';
		this.transform = h ? 'translateX' : 'translateY';
		this.dimension = h ? 'width' : 'height';
		this.boundary = h ? 'left' : 'top';
	},

	/**
	* @private
	*/
	setInlineStyles: function (value, dimensions) {
		var inBounds = {};

		if (this.unitModifier) {
			inBounds[this.boundary] = this.percentToPixels(value, this.unitModifier);
			inBounds[this.dimension] = this.unitModifier;
			this.setBounds(inBounds);
		} else {
			if (dimensions) {
				inBounds[this.dimension] = dimensions;
			} else {
				inBounds[this.boundary] = value;
			}
			this.setBounds(inBounds, this.unit);
		}
	},

	/**
	* @fires module:layout/Slideable~Slideable#onChange
	* @private
	*/
	valueChanged: function (last) {
		var v = this.value;
		if (this.isOob(v) && !this.isAnimating()) {
			this.value = this.overMoving ? this.dampValue(v) : this.clampValue(v);
		}
		// FIXME: android cannot handle nested compositing well so apply acceleration only if needed
		// desktop chrome doesn't like this code path so avoid...
		if (platform.android > 2) {
			if (this.value) {
				if (last === 0 || last === undefined) {
					dom.accelerate(this, this.accelerated);
				}
			} else {
				dom.accelerate(this, false);
			}
		}

		// If platform supports transforms
		if (this.canTransform) {
			dom.transformValue(this, this.transform, this.value + this.unit);
		// else update inline styles
		} else {
			this.setInlineStyles(this.value, false);
		}
		this.doChange();
	},

	/**
	* @private
	*/
	getAnimator: function () {
		return this.$.animator;
	},

	/**
	* @private
	*/
	isAtMin: function () {
		return this.value <= this.calcMin();
	},

	/**
	* @private
	*/
	isAtMax: function () {
		return this.value >= this.calcMax();
	},

	/**
	* @private
	*/
	calcMin: function () {
		return this.min;
	},

	/**
	* @private
	*/
	calcMax: function () {
		return this.max;
	},

	/**
	* @private
	*/
	clampValue: function (value) {
		var min = this.calcMin();
		var max = this.calcMax();
		return Math.max(min, Math.min(value, max));
	},

	/**
	* @private
	*/
	dampValue: function (value) {
		return this.dampBound(this.dampBound(value, this.min, 1), this.max, -1);
	},

	/**
	* @private
	*/
	dampBound: function (value, boundary, sign) {
		var v = value;
		if (v * sign < boundary * sign) {
			v = boundary + (v - boundary) / 4;
		}
		return v;
	},

	/**
	* Calculates the pixel value corresponding to the specified `percent` and
	* `dimension`.
	*
	* @param  {Number} percent
	* @param  {Number} dimension
	*
	* @return {Number}
	* @private
	*/
	percentToPixels: function (percent, dimension) {
		return Math.floor((dimension / 100) * percent);
	},

	/**
	* @private
	*/
	pixelsToPercent: function (value) {
		var boundary = this.unitModifier ? this.getBounds()[this.dimension] : this.container.getBounds()[this.dimension];
		return (value / boundary) * 100;
	},

	/**
	* @private
	*/
	shouldDrag: function (event) {
		return this.draggable && event[this.shouldDragProp];
	},

	/**
	* Determines whether the specified value is out of bounds (i.e., greater than
	* [max]{@link module:layout/Slideable~Slideable#max} or less than [min]{@link module:layout/Slideable~Slideable#min}).
	*
	* @param {Number} value - The value to check.
	* @return {Boolean} `true` if `value` is out of bounds; otherwise, `false`.
	* @private
	*/
	isOob: function (value) {
		return value > this.calcMax() || value < this.calcMin();
	},

	/**
	* @private
	*/
	dragstart: function (sender, event) {
		if (this.shouldDrag(event)) {
			event.preventDefault();
			this.$.animator.stop();
			event.dragInfo = {};
			this.dragging = true;
			this.drag0 = this.value;
			this.dragd0 = 0;
			return this.preventDragPropagation;
		}
	},

	/**
	* Updates [value]{@link module:layout/Slideable~Slideable#value} during a drag and determines the
	* direction of the drag.
	*
	* @private
	*/
	drag: function (sender, event) {
		if (this.dragging) {
			event.preventDefault();
			var d = this.canTransform ? event[this.dragMoveProp] * this.kDragScalar : this.pixelsToPercent(event[this.dragMoveProp]);
			var v = this.drag0 + d;
			var dd = d - this.dragd0;
			this.dragd0 = d;
			if (dd) {
				event.dragInfo.minimizing = dd < 0;
			}
			this.setValue(v);
			return this.preventDragPropagation;
		}
	},

	/**
	* @private
	*/
	dragfinish: function (sender, event) {
		if (this.dragging) {
			this.dragging = false;
			this.completeDrag(event);
			event.preventTap();
			return this.preventDragPropagation;
		}
	},

	/**
	* Animates the control to either the [min]{@link module:layout/Slideable~Slideable#min} or
	* [max]{@link module:layout/Slideable~Slideable#max} value when dragging completes, based on the
	* direction of the drag (determined in [drag()]{@link module:layout/Slideable~Slideable#drag}).
	*
	* @private
	*/
	completeDrag: function (event) {
		if (this.value !== this.calcMax() && this.value != this.calcMin()) {
			this.animateToMinMax(event.dragInfo.minimizing);
		}
	},

	/**
	* @private
	*/
	isAnimating: function () {
		return this.$.animator.isAnimating();
	},

	/**
	* @private
	*/
	play: function (start, end) {
		this.$.animator.play({
			startValue: start,
			endValue: end,
			node: this.hasNode()
		});
	},

	/**
	* Animates to the given value.
	*
	* @param   {Number} value - The value to animate to.
	* @public
	*/
	animateTo: function (value) {
		this.play(this.value, value);
	},

	/**
	* Animates to the [minimum]{@link module:layout/Slideable~Slideable#min} value.
	*
	* @public
	*/
	animateToMin: function () {
		this.animateTo(this.calcMin());
	},

	/**
	* Animates to the [maximum]{@link module:layout/Slideable~Slideable#max} value.
	*
	* @public
	*/
	animateToMax: function () {
		this.animateTo(this.calcMax());
	},

	/**
	* Helper method to toggle animation to either the [min]{@link module:layout/Slideable~Slideable#min}
	* or [max]{@link module:layout/Slideable~Slideable#max} value.
	*
	* @param  {Boolean} min - Whether to animate to the minimum value.
	* @private
	*/
	animateToMinMax: function (min) {
		if (min) {
			this.animateToMin();
		} else {
			this.animateToMax();
		}
	},

	/**
	* Updates the [value]{@link module:layout/Slideable~Slideable#value} property during animation.
	*
	* @private
	*/
	animatorStep: function (sender) {
		this.setValue(sender.value);
		return true;
	},

	/**
	* @fires module:layout/Slideable~Slideable#onAnimateFinish
	* @private
	*/
	animatorComplete: function (sender) {
		this.doAnimateFinish(sender);
		return true;
	},

	/**
	* Toggles animation to either the [min]{@link module:layout/Slideable~Slideable#min} or
	* [max]{@link module:layout/Slideable~Slideable#max} value.
	*
	* @public
	*/
	toggleMinMax: function () {
		this.animateToMinMax(!this.isAtMin());
	}
});
