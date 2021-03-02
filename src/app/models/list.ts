export class List {
  data: any[] = [];
  total_pages = 0;
  page = 0;
  total_count = 0;

  static fromDTO(dto: any): List {
    const list = new List;
    list.page = dto.page;
    list.total_pages = dto.total_pages;
    list.data = dto.data;
    list.total_count = dto.total_count;
    return list;
  }

  public find(id: string, env: string, v: string, exec = null) {
    const app = this.data.find(a => a.app_id === id && a.env === env && v === (a.deploy_version || a.build_version || a.version));
    if (app && exec) {
      exec(app);
    }
    return app;
  }

  public findTyped(id: string, env: string, type: string, exec = null) {
    const app = this.data.find(a => a.app_id === id && a.env === env && a.type === type);
    if (app && exec) {
      exec(app);
    }
    return app;
  }

  public replace(id: string, env: string, v: string, data: any) {
    const appIndex = this.data.findIndex(
      a => a.app_id === id && a.env === env && v === (a.deploy_version || a.build_version || a.version)
    );

    if (appIndex <= -1) {
      return;
    }
    this.data[appIndex] = data;
  }

}
