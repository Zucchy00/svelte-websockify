<script lang="ts">
	import { NoVNC } from "svelte-vnc";
    let host:string = "172.16.200.2"
    let port:string = "5900"
    let username:string = "username"
    let password:string = "1234"
</script>

<div class="w-screen h-screen">
    <NoVNC class="w-full h-full" clearLocalStorage={true} host={host} username={username} password={password} port={port} autoconnect={true} show_dot={true} embedded_server={true} resize="scale"/>
</div>