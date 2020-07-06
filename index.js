const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;
//configuration variables
const cellsHorizontal = 5;
const cellsVertical = 5;
const width = window.innerWidth;
const height = window.innerHeight;

const unitLengthX = width / cellsHorizontal;
const unitLengthY = height / cellsVertical;

//creates a Matter.js box where we can add and manipulate shapes
const engine = Engine.create();
engine.world.gravity.y = 0;
const { world } = engine;
const render = Render.create({
	element: document.body,
	engine: engine,
	options: {
		wireframes: false,
		width,
		height
	}
});
Render.run(render);
Runner.run(Runner.create(), engine);

//border walls
const createBorder = () => {
	const walls = [
		Bodies.rectangle(width / 2, 0, width, 2, { isStatic: true }),
		Bodies.rectangle(width / 2, height, width, 2, { isStatic: true }),
		Bodies.rectangle(0, height / 2, 2, height, { isStatic: true }),
		Bodies.rectangle(width, height / 2, 2, height, { isStatic: true })
	];
	World.add(world, walls);
};

//Maze generation

//shuffle the contents of an array
const shuffle = (arr) => {
	let counter = arr.length;

	while (counter > 0) {
		const index = Math.floor(Math.random() * counter);

		counter--;

		const temp = arr[counter];
		arr[counter] = arr[index];
		arr[index] = temp;
	}

	return arr;
};

//set up two dimensional arrays
// let grid = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal).fill(false));
// let verticals = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal - 1).fill(false));
// let horizontals = Array(cellsVertical - 1).fill(null).map(() => Array(cellsHorizontal).fill(false));

const stepThroughCell = (row, column, grid, horizontals, verticals) => {
	//if I have visited the cell at [row, column], then return
	if (grid[row][column]) {
		return;
	}

	//mark this cell as being visited
	grid[row][column] = true;

	//Assemble randomly-ordered list of neighbors
	const neighbors = shuffle([
		[ row - 1, column, 'up' ],
		[ row, column + 1, 'right' ],
		[ row + 1, column, 'down' ],
		[ row, column - 1, 'left' ]
	]);

	//for each neighboor...
	for (let neighbor of neighbors) {
		const [ nextRow, nextColumn, direction ] = neighbor;
		//see if that neighbor is out of bounds
		if (nextRow < 0 || nextRow >= cellsVertical || nextColumn < 0 || nextColumn >= cellsHorizontal) {
			continue;
		}
		//If we have visited that neighbor, continue to next neighbor
		if (grid[nextRow][nextColumn]) {
			continue;
		}
		//Remove a wall from either horizontals or verticals
		if (direction === 'left') {
			verticals[row][column - 1] = true;
		} else if (direction === 'right') {
			verticals[row][column] = true;
		} else if (direction === 'up') {
			horizontals[row - 1][column] = true;
		} else if (direction === 'down') {
			horizontals[row][column] = true;
		}

		//visit next cell
		stepThroughCell(nextRow, nextColumn, grid, horizontals, verticals);
	}
};

const createWalls = (horizontals, verticals) => {
	horizontals.forEach((row, rowIndex) => {
		row.forEach((open, columnIndex) => {
			if (open) {
				return;
			}

			const wall = Bodies.rectangle(
				columnIndex * unitLengthX + unitLengthX / 2,
				rowIndex * unitLengthY + unitLengthY,
				unitLengthX,
				5,
				{
					label: 'wall',
					friction: 1,
					isStatic: true,
					render: {
						fillStyle: 'red'
					}
				}
			);
			World.add(world, wall);
		});
	});

	verticals.forEach((row, rowIndex) => {
		row.forEach((open, columnIndex) => {
			if (open) {
				return;
			}

			const wall = Bodies.rectangle(
				columnIndex * unitLengthX + unitLengthX,
				rowIndex * unitLengthY + unitLengthY / 2,
				5,
				unitLengthY,
				{
					label: 'wall',
					isStatic: true,
					render: {
						fillStyle: 'red'
					}
				}
			);
			World.add(world, wall);
		});
	});
};

//goal
const createGoal = () => {
	const goal = Bodies.rectangle(
		width - unitLengthX / 2,
		height - unitLengthY / 2,
		unitLengthX * 0.7,
		unitLengthY * 0.7,
		{
			isStatic: true,
			label: 'goal',
			render: {
				fillStyle: 'green'
			}
		}
	);
	World.add(world, goal);
};

//ball
const createBall = () => {
	const ballRadius = Math.min(unitLengthX, unitLengthY) / 3;
	const ball = Bodies.circle(unitLengthX / 2, unitLengthY / 2, ballRadius, {
		label: 'ball',
		friction: 0,
		render: {
			fillStyle: 'blue'
		}
	});
	World.add(world, ball);
	return ball;
};

const moveBall = (ball) => {
	const setVelocity = 10;
	document.addEventListener('keydown', (event) => {
		const { x, y } = ball.velocity;
		if (event.key === 'w' || event.key === 'ArrowUp') {
			Body.setVelocity(ball, { x, y: -setVelocity });
		}
		if (event.key === 'd' || event.key === 'ArrowRight') {
			Body.setVelocity(ball, { x: setVelocity, y });
		}
		if (event.key === 's' || event.key === 'ArrowDown') {
			Body.setVelocity(ball, { x, y: setVelocity });
		}
		if (event.key === 'a' || event.key === 'ArrowLeft') {
			Body.setVelocity(ball, { x: -setVelocity, y });
		}
	});
};

//Win condition
Events.on(engine, 'collisionStart', (event) => {
	event.pairs.forEach((collision) => {
		const labels = [ 'ball', 'goal' ];
		if (labels.includes(collision.bodyA.label) && labels.includes(collision.bodyB.label)) {
			document.querySelector('.winner').classList.remove('hidden');
			world.gravity.y = 1;
			world.bodies.forEach((body) => {
				if (body.label === 'wall') {
					Body.setStatic(body, false);
				}
			});
			const resetButton = document.querySelector('.reset');
			resetButton.addEventListener('click', () => {
				document.querySelector('.winner').classList.add('hidden');
				world.gravity.y = 0;
				reset();
			});
		}
	});
});

initialize = () => {
	let grid = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal).fill(false));
	let verticals = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal - 1).fill(false));
	let horizontals = Array(cellsVertical - 1).fill(null).map(() => Array(cellsHorizontal).fill(false));

	const startRow = Math.floor(Math.random() * cellsVertical);
	const startColumn = Math.floor(Math.random() * cellsHorizontal);
	createBorder();
	stepThroughCell(startRow, startColumn, grid, horizontals, verticals);
	createWalls(horizontals, verticals);
	createGoal();
	moveBall(createBall());
};

reset = () => {
	World.clear(world);
	initialize();
};

initialize();
