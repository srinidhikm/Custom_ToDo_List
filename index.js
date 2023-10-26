import 'dotenv/config'
import express from "express"
import bodyParser from "body-parser";
import mongoose from "mongoose";


const DB = process.env.DB;
const app = express();
const port = process.env.PORT;
let title=""; // Stores list name
let customListsArray=[]; // Array of names of cutom lists
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];



app.use(express.static("public"));

// Logger
function logger(req, res, next)
{
    console.log(req.method+" "+req.url)
    next();
}
app.use(logger);

app.use(bodyParser.urlencoded({extended:true}))

// Mongoose ____________________________________________________________

// Database connection
mongoose.connect(DB, {useNewUrlParser: true}).then(()=>
{
    console.log('Connected database')
}).catch((err)=> console.log('Failed database connection'))

// Schema for a single task
const taskSchema = mongoose.Schema(
    {
        name:String,
    }
)
const Today = mongoose.model("Today",taskSchema);
const Work = mongoose.model("Work", taskSchema);

const customListSchema = mongoose.Schema(
    {
        listname: String,
        tasks: [taskSchema],
    }
)
const CustomList = mongoose.model("CustomList", customListSchema);




//___________________________________________________________________________________

// Poplulates customListsArray every time the server starts
CustomList.find({}).then((res)=>
{
    res.forEach((customList)=>
    {
        customListsArray.push(customList.listname.toLowerCase());
    })
    console.log(customListsArray);
}).catch((err)=>console.log(err))


// Root page showing Today list
app.get("/", (req, res)=>
{
    const currDate = new Date();
    title = `${currDate.getDate()} ${days[currDate.getDay()]} ${months[currDate.getMonth()]}`;

    Today.find({}).then((todayTasks)=> {res.render("index.ejs",{todayTasks, title, route:'today', customListsArray})}).catch((err)=>console.log(err));
})

// Shows work list
app.get("/work", (req, res)=>
{
    title = "Work";
    Work.find({}).then((workTasks)=> {res.render("index.ejs", {workTasks, title, route:'work', customListsArray})}).catch((err)=>console.log(err))
})

// Adds new task for today list
app.post("/submit", (req, res)=>
{
    const newTodayTask = new Today(
        {
            name: req.body["todayTask"]
        }
    )
    newTodayTask.save();

    res.redirect("/")
})

// Adds new task for work list
app.post("/submitwork", (req, res)=>
{
    const newWork = new Work(
        {
            name: req.body["workTask"]
        }
    )
    newWork.save();
    res.redirect("/work");
})


// Deletes task for today list
app.post("/delete", (req, res)=>
{
    const id = req.body["checkbox"];
    Today.deleteOne({_id:id}).then((result)=>{res.redirect("/")}).catch((err)=>console.log(err));
})


// Deletes task for work list
app.post("/deletework", (req, res)=>
{
    const id = req.body["checkbox"];
    Work.deleteOne({_id:id}).then((result)=>{res.redirect("/work")}).catch((err)=>console.log(err));
})



//Custom List_________________________________________________________________________________

// Creates new list and redirects to that empty list or the already existing list
app.post("/customList", (req, res)=>
{
    const newListName = req.body["customList"].toLowerCase();

    if (customListsArray.includes(newListName)) {
        console.log(`present`);
        res.redirect(`/${newListName}`);
      } else {
        console.log(`not preesnt`);
        const newList = new CustomList(
            {
                listname: newListName,
            }
        )
        newList.save();
        customListsArray.push(newList.listname);
        res.redirect(`/${newListName}`);
      }


})

// Displays the list with its items
app.get("/:listName", (req, res)=>
{
    const listName = req.params.listName.toLowerCase();
    console.log(listName);
    
    CustomList.findOne({listname:listName}).then((customList)=> { 
        console.log(customList);
        title = customList.listname;
        res.render("customlist.ejs", {customListsArray, title, customList}) 
    }).catch((err)=>console.log(err));
})

// Deletes custom list by name (Case insensitive. The names are always stored in lower case)
app.post("/deleteList", (req, res)=>
{
    const listName = req.body["listCheckbox"].toLowerCase();
    console.log(listName);
    CustomList.deleteOne({listname: listName}).then((result)=>
    {
        customListsArray.splice(customListsArray.indexOf(listName), 1);
        res.redirect("/");
    }).catch((err)=>console.log(err));
})

// Adds new task to the custom list by list name.
app.post("/:listName", (req, res)=>
{
    const listName = req.params.listName;
    const newItem = req.body["Task"];
    console.log(listName);
    console.log(newItem);

    const newTask = {
        name: newItem,
      };

    CustomList.findOneAndUpdate(
        {
            listname: listName,
        },
        {
            $push: { tasks: newTask }
        }
    ).then((result)=>
    {
        res.redirect(`/${listName}`);
    }).catch((err)=> console.log(err));

})

// Deletes task from a custom list using its list name and the task id
app.post("/deletecl/:title", (req, res)=>
{
    const listName = req.params.title;
    const taskId = req.body["checkbox"];
    console.log(listName);
    console.log(taskId);
    
    CustomList.findOneAndUpdate(
        {
            listname: listName   
        },
        {
            $pull:
            {
                tasks : { _id: taskId }
            }
        }
    ).then((result)=>
    {
        res.redirect(`/${listName}`);
    }).catch((err)=> console.log(err));

})



//____________________________________________________________________________________________


app.listen(port, ()=>
{
    console.log(`Listening at port ${port}`)
})