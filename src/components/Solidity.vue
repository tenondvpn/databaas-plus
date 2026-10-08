<template>
  <div class="iframe-container">
    <iframe 
      src="http://47.111.109.8:8080/solidity" 
      frameborder="0" 
      width="100%" 
      height="100%">
    </iframe>
  </div>
</template>

<style scoped>
.iframe-container {
  width: 100%;
  /* 根据你的系统布局调整高度，例如计算掉顶部导航栏的高度 */
  height: calc(100vh - 60px); 
}
</style>

