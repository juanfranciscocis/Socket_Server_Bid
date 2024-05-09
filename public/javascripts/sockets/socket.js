const {io} = require('../../../app');
const bidding_model = require('../../model/bidding_model')

/**
 * This event is triggered when a client connects to the server.
 * The function logs the id of the connected client.
 * The function listens for the following events:
 * - get-paintings
 * - get-painting
 * - new-bid
 * - disconnect
 * @event io.on('connection')
 * @param {object} client - The client object.
 */
io.on('connection', (client) => {
    console.log('Client connected ' + client.id);
    active_auction_painting_id = null;
    time = 5
    io.emit('get-paintings',{
        type:'success',
        text:'Paintings',
        bidding_model
    })

    /**
     * This event is emitted to all connected clients when the 'get-paintings' event is received from a client.
     * The event data contains the bidding_model object.
     *
     * @event io.emit('get-paintings')
     * @type {object}
     * @property {object} bidding_model - The bidding model object.
     */
    client.on('get-paintings',() =>{
        console.log('Paintings');
        io.emit('get-paintings',{
            type:'success',
            text:'Paintings',
            bidding_model
        })
    });


    /**
     * This event is triggered when a 'get-painting' event is received from a client.
     * The event data contains the id of the painting.
     * If the painting exists, a 'get-painting' event is emitted with a 'success' type and the painting object.
     * If the painting does not exist, a 'get-painting' event is emitted with an 'error' type and a message.
     *
     * @event client.on('get-painting')
     * @param {object} id - The id object of the painting.
     * @property {string} id.id - The id of the painting.
     */
    client.on('get-painting',(id)=>{
        let painting = bidding_model[id.id] ?? NaN
        if (painting){
            io.emit('get-painting',{
                type:'success',
                text:'Painting by id + ' + id.id,
                painting
            })
        }else {
            io.emit('get-painting',{
                type:'error',
                text:'Painting not found'
            })
        }
    });


    /**
     * This event is triggered when a 'new-bid' event is received from a client.
     * The event data contains the bid object.
     * The function first checks if the painting exists and is not sold.
     * If the painting exists and is not sold, it checks if the client_id exists and if the bid price is higher than the current price.
     * If all conditions are met, the painting's price and lastBidID are updated, a 'new-bid' event is emitted with a 'success' type and the painting object, and the startTimer function is called.
     * If any condition is not met, a 'new-bid' event is emitted with an 'error' type and a corresponding message.
     *
     * @event client.on('new-bid')
     * @param {object} bid - The bid object.
     * @property {string} bid.id - The id of the painting.
     * @property {string} bid.client_id - The id of the client.
     * @property {number} bid.price - The price of the bid.
     */
    client.on('new-bid', (bid) => {
        let painting = bidding_model[bid.id];
        if (!painting) {
            return io.emit('new-bid', { type: 'error', text: 'Painting not found' });
        }
        if (painting.isSold) {
            return io.emit('new-bid', { type: 'bid_timeout', text: 'Painting is already sold' });
        }
        if (!bid.client_id || painting.price >= bid.price) {
            let errorText = bid.client_id ? 'Bid price is lower than $' + painting.price : 'Client ID not found';
            return io.emit('new-bid', { type: 'error', text: errorText });
        }

        painting.price = bid.price;
        painting.lastBidID = bid.client_id;
        io.emit('new-bid', { type: 'success', painting });
        startTimer(bid.id);
    });

    /**
     * @event client.on('active-auction')
     */
    client.on('active-auction',()=>{
        console.log("active-auction check")
        if (active_auction_painting_id){
            io.emit('active-auction',{
                active:true,
                painting_id: active_auction_painting_id
            })
        }else {
            io.emit('active-auction',{
                active:false,
                painting_id: null
            })
        }
    });

    /**
     * This event is triggered when a client disconnects from the server.
     * The function logs the id of the disconnected client.
     *
     * @event client.on('disconnect')
     */
    client.on('disconnect', () => {
        console.log('Client disconnected ' + client.id);
    });

});

/**
 * Starts a timer for a specific painting's bid. The timer is set to 5 seconds.
 * When the timer reaches 0, the painting is marked as sold and a 'new-bid' event is emitted with a 'bid_timeout' type.
 *
 * @function startTimer
 * @param {string} id - The id of the painting.
 */
const startTimer = (id) => {
    if(active_auction_painting_id && id == active_auction_painting_id){
        console.log("New bit in Auction")
        time = 5
        return;
    }
    active_auction_painting_id = id
    let timer = setInterval(()=>{
        io.emit('active-auction',{
            active:true,
            timer:time,
            painting_id: active_auction_painting_id
        })
        
        time--
        if (time === 0){
            clearInterval(timer)
            let painting = bidding_model[id]
            painting.isSold = true
            io.emit('active-auction',{
                active:false,
                timer:time,
                active_auction_painting_id:null
            })
            io.emit('get-paintings',{
                type:'success',
                text:'Paintings',
                bidding_model
            })
            
            io.emit('new-bid',{
                type:'bid_timeout',
                text:'Bid time is over for painting id ' + painting.id,
                painting
            })
            time = 5;
            active_auction_painting_id = null;
        }
    },1000)
}


