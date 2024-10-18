import { DeepPartial, FindOneOptions } from 'typeorm';

export interface BaseRepositoryInterface<T> {
  create(data: DeepPartial<T>): Promise<T>;

  save(entity: T): Promise<T>;

  findOneBy(filterQuery: FindOneOptions<T>): Promise<T>;

  findOneAndUpdate(
    filterQuery: FindOneOptions<T>,
    update: DeepPartial<T>,
  ): Promise<T>;

  find(filterQuery: FindOneOptions<T>): Promise<T[]>;

  findBy(filterQuery: FindOneOptions<T>): Promise<T[]>;

  findAll(): Promise<T[]>;

  findOneAndDelete(filterQuery: FindOneOptions<T>): Promise<T>;

  findByIds(ids: number[]): Promise<T[]>;

  preload(entityLike: DeepPartial<T>): Promise<T>;
}

/*
-PRELOAD-
  + Phương thức preload của TypeORM cố gắng tìm và trả về một thực thể dựa trên ID hoặc một khóa chính khác 
  từ dữ liệu đã truyền vào. Nếu tìm thấy thực thể trong cơ sở dữ liệu, nó sẽ tải dữ liệu hiện có và sau đó cập nhật những thuộc tính bạn cung cấp. 
  Nếu không tìm thấy thực thể, nó sẽ trả về undefined.
*/
