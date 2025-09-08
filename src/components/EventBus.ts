// eventBus.ts
import mitt from 'mitt';

// 定义事件类型和载荷类型
type EventTypes = {
  'update_graph': {  };
  'show_update_graph': {  };
  'notificatio': {}; // 简单载荷可以直接定义类型
};

const emitter = mitt<EventTypes>(); // 使用泛型传递事件类型
export default emitter;
