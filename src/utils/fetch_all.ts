import axios from 'axios';
type FetchAllResult<T> = {
    data: T[];
    errors: string[];
  };

export const  fetchDynamicRequests = async <T>(urls:string[]):Promise<FetchAllResult<T>> => {
    // 1. 动态生成请求数组
    const requests = urls.map(url => 
      axios.get<T>(url).catch(error => ({ error })) // 捕获单请求错误，避免整体中断
    );
  
    try {
      // 2. 等待所有请求完成（不因单个失败中断）
      const results = await Promise.allSettled(requests);
      
      // 3. 分类处理结果
      const data:T[] = [];
      const errors:string[] = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          // 成功请求：存入数据
          if(result.value && 'data' in result.value){
            data.push(result.value.data);
          }
        } else {
          // 失败请求：记录错误信息
          errors.push(result.reason.message || 'Request failed');
        }
      });
      return { data, errors };
    } catch (error) {
      // 全局错误处理（如网络中断）
      return { data: [], errors: [error instanceof Error ? error.message : String(error)] };
    }
  }