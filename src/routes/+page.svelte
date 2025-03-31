<script lang="ts">
	import { NoVNC } from "svelte-vnc";
    let host:string = "172.16.182.158"
    let port:string = "5900"
</script>

<div class="w-screen h-screen">
    <NoVNC class="w-full h-full" clearLocalStorage={true} host={host} port={port} autoconnect={false} embedded_server={true} resize="scale"/>
</div>