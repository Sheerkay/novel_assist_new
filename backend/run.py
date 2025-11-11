from app import create_app

app = create_app()

if __name__ == '__main__':
    # 注意：这里的 host='0.0.0.0' 是为了方便在局域网内访问，如果不需要可以去掉
    app.run(host='0.0.0.0', port=5000, debug=True)
