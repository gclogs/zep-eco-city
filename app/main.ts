import { ScriptPlayer } from "zep-script";
import { OnJoinPlayer } from "./src/events/OnJoinPlayer";

ScriptApp.onInit.Add(()=>{
    new OnJoinPlayer();
})